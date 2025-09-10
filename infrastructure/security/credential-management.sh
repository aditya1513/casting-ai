#!/bin/bash
# CastMatch Secure Credential Management System
# Production-ready secrets management with AWS Secrets Manager and HashiCorp Vault

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/credentials.env"

# Default values
AWS_REGION="${AWS_REGION:-us-east-1}"
SECRETS_MANAGER_PREFIX="${SECRETS_MANAGER_PREFIX:-castmatch/production}"
VAULT_ADDR="${VAULT_ADDR:-https://vault.castmatch.com:8200}"
VAULT_PATH="${VAULT_PATH:-castmatch/production}"

# Logging
LOG_FILE="/var/log/castmatch/credential-management.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check dependencies
check_dependencies() {
    local deps=("aws" "vault" "gpg" "jq" "openssl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            error_exit "Required dependency '$dep' not found"
        fi
    done
}

# Initialize AWS Secrets Manager
init_aws_secrets() {
    log "Initializing AWS Secrets Manager..."
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error_exit "AWS credentials not configured"
    fi
    
    # Create KMS key for encryption
    local key_id=$(aws kms create-key \
        --description "CastMatch Production Secrets Encryption Key" \
        --usage ENCRYPT_DECRYPT \
        --key-spec SYMMETRIC_DEFAULT \
        --query 'KeyMetadata.KeyId' \
        --output text 2>/dev/null || echo "")
    
    if [[ -n "$key_id" ]]; then
        log "Created KMS key: $key_id"
        
        # Create key alias
        aws kms create-alias \
            --alias-name "alias/castmatch-production-secrets" \
            --target-key-id "$key_id" 2>/dev/null || log "Key alias may already exist"
    fi
    
    log "AWS Secrets Manager initialization completed"
}

# Initialize HashiCorp Vault
init_vault() {
    log "Initializing HashiCorp Vault..."
    
    # Check if Vault is already initialized
    if vault status &> /dev/null; then
        log "Vault is already initialized"
        return 0
    fi
    
    # Initialize Vault
    local init_output=$(vault operator init -key-shares=5 -key-threshold=3 -format=json)
    
    # Save unseal keys and root token securely
    echo "$init_output" | jq -r '.unseal_keys_b64[]' > "${SCRIPT_DIR}/vault-unseal-keys.txt"
    echo "$init_output" | jq -r '.root_token' > "${SCRIPT_DIR}/vault-root-token.txt"
    
    # Encrypt sensitive files
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
        --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65011712 \
        --passphrase "${VAULT_ENCRYPTION_KEY}" --batch --yes \
        "${SCRIPT_DIR}/vault-unseal-keys.txt"
    
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
        --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65011712 \
        --passphrase "${VAULT_ENCRYPTION_KEY}" --batch --yes \
        "${SCRIPT_DIR}/vault-root-token.txt"
    
    # Remove plaintext files
    rm "${SCRIPT_DIR}/vault-unseal-keys.txt" "${SCRIPT_DIR}/vault-root-token.txt"
    
    log "Vault initialization completed"
}

# Unseal Vault
unseal_vault() {
    log "Unsealing Vault..."
    
    # Decrypt unseal keys
    gpg --decrypt --batch --yes --passphrase "${VAULT_ENCRYPTION_KEY}" \
        "${SCRIPT_DIR}/vault-unseal-keys.txt.gpg" > /tmp/unseal-keys.txt
    
    # Unseal with first 3 keys
    head -n 3 /tmp/unseal-keys.txt | while read -r key; do
        vault operator unseal "$key"
    done
    
    # Cleanup
    rm /tmp/unseal-keys.txt
    
    log "Vault unsealed successfully"
}

# Store secret in AWS Secrets Manager
store_aws_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="${3:-CastMatch production secret}"
    
    log "Storing secret in AWS Secrets Manager: $secret_name"
    
    # Create or update secret
    if aws secretsmanager describe-secret --secret-id "${SECRETS_MANAGER_PREFIX}/${secret_name}" &> /dev/null; then
        # Update existing secret
        aws secretsmanager update-secret \
            --secret-id "${SECRETS_MANAGER_PREFIX}/${secret_name}" \
            --secret-string "$secret_value" \
            --kms-key-id "alias/castmatch-production-secrets" > /dev/null
        log "Updated existing secret: $secret_name"
    else
        # Create new secret
        aws secretsmanager create-secret \
            --name "${SECRETS_MANAGER_PREFIX}/${secret_name}" \
            --description "$description" \
            --secret-string "$secret_value" \
            --kms-key-id "alias/castmatch-production-secrets" > /dev/null
        log "Created new secret: $secret_name"
    fi
}

# Retrieve secret from AWS Secrets Manager
get_aws_secret() {
    local secret_name="$1"
    local output_file="${2:-}"
    
    log "Retrieving secret from AWS Secrets Manager: $secret_name"
    
    local secret_value=$(aws secretsmanager get-secret-value \
        --secret-id "${SECRETS_MANAGER_PREFIX}/${secret_name}" \
        --query 'SecretString' \
        --output text 2>/dev/null)
    
    if [[ -n "$secret_value" ]]; then
        if [[ -n "$output_file" ]]; then
            echo "$secret_value" > "$output_file"
            chmod 600 "$output_file"
            log "Secret written to file: $output_file"
        else
            echo "$secret_value"
        fi
    else
        error_exit "Failed to retrieve secret: $secret_name"
    fi
}

# Store secret in HashiCorp Vault
store_vault_secret() {
    local secret_path="$1"
    local secret_data="$2"
    
    log "Storing secret in Vault: $secret_path"
    
    # Authenticate with Vault (assumes token is already set)
    if ! vault auth -method=token token="$(cat ~/.vault-token)" &> /dev/null; then
        error_exit "Vault authentication failed"
    fi
    
    # Store secret
    echo "$secret_data" | vault kv put "${VAULT_PATH}/${secret_path}" -
    
    log "Secret stored in Vault: $secret_path"
}

# Retrieve secret from HashiCorp Vault
get_vault_secret() {
    local secret_path="$1"
    local field="${2:-value}"
    local output_file="${3:-}"
    
    log "Retrieving secret from Vault: $secret_path"
    
    local secret_value=$(vault kv get -field="$field" "${VAULT_PATH}/${secret_path}" 2>/dev/null)
    
    if [[ -n "$secret_value" ]]; then
        if [[ -n "$output_file" ]]; then
            echo "$secret_value" > "$output_file"
            chmod 600 "$output_file"
            log "Secret written to file: $output_file"
        else
            echo "$secret_value"
        fi
    else
        error_exit "Failed to retrieve secret: $secret_path"
    fi
}

# Generate secure random password
generate_password() {
    local length="${1:-32}"
    local special_chars="${2:-true}"
    
    if [[ "$special_chars" == "true" ]]; then
        openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
    else
        openssl rand -base64 "$length" | tr -d "=+/!@#$%^&*()[]{}|;:,.<>?" | cut -c1-"$length"
    fi
}

# Generate JWT secret
generate_jwt_secret() {
    local length="${1:-64}"
    openssl rand -hex "$length"
}

# Generate SSL certificate and key
generate_ssl_cert() {
    local domain="$1"
    local output_dir="${2:-/tmp/ssl}"
    local days="${3:-365}"
    
    log "Generating SSL certificate for domain: $domain"
    
    mkdir -p "$output_dir"
    
    # Generate private key
    openssl genrsa -out "${output_dir}/${domain}.key" 2048
    
    # Generate certificate signing request
    openssl req -new -key "${output_dir}/${domain}.key" \
        -out "${output_dir}/${domain}.csr" \
        -subj "/C=US/ST=California/L=San Francisco/O=CastMatch/CN=${domain}"
    
    # Generate self-signed certificate
    openssl x509 -req -days "$days" \
        -in "${output_dir}/${domain}.csr" \
        -signkey "${output_dir}/${domain}.key" \
        -out "${output_dir}/${domain}.crt"
    
    # Set proper permissions
    chmod 600 "${output_dir}/${domain}.key"
    chmod 644 "${output_dir}/${domain}.crt"
    
    log "SSL certificate generated: ${output_dir}/${domain}.crt"
}

# Setup production secrets
setup_production_secrets() {
    log "Setting up production secrets..."
    
    # Database credentials
    local db_password=$(generate_password 32 false)
    store_aws_secret "database/password" "$db_password" "PostgreSQL production password"
    
    local redis_password=$(generate_password 32 false)
    store_aws_secret "redis/password" "$redis_password" "Redis production password"
    
    # JWT secrets
    local jwt_secret=$(generate_jwt_secret 64)
    store_aws_secret "jwt/secret" "$jwt_secret" "JWT signing secret"
    
    local nextauth_secret=$(generate_jwt_secret 64)
    store_aws_secret "nextauth/secret" "$nextauth_secret" "NextAuth secret"
    
    # OAuth credentials (placeholders - replace with actual values)
    store_aws_secret "oauth/google/client-id" "GOOGLE_CLIENT_ID_PLACEHOLDER" "Google OAuth client ID"
    store_aws_secret "oauth/google/client-secret" "GOOGLE_CLIENT_SECRET_PLACEHOLDER" "Google OAuth client secret"
    store_aws_secret "oauth/github/client-id" "GITHUB_CLIENT_ID_PLACEHOLDER" "GitHub OAuth client ID"
    store_aws_secret "oauth/github/client-secret" "GITHUB_CLIENT_SECRET_PLACEHOLDER" "GitHub OAuth client secret"
    
    # Email service credentials
    store_aws_secret "email/smtp/password" "SMTP_PASSWORD_PLACEHOLDER" "SMTP service password"
    
    # API keys
    local api_key=$(generate_password 48 false)
    store_aws_secret "api/internal-key" "$api_key" "Internal API key"
    
    # Encryption keys
    local backup_key=$(generate_password 64 false)
    store_aws_secret "backup/encryption-key" "$backup_key" "Backup encryption key"
    
    local csrf_key=$(generate_password 48 false)
    store_aws_secret "security/csrf-key" "$csrf_key" "CSRF protection key"
    
    # SSL backup passphrase
    local ssl_passphrase=$(generate_password 32 true)
    store_aws_secret "ssl/backup-passphrase" "$ssl_passphrase" "SSL backup encryption passphrase"
    
    log "Production secrets setup completed"
}

# Generate environment file from secrets
generate_env_file() {
    local env_type="${1:-production}"
    local output_file="${2:-/opt/castmatch/.env.${env_type}}"
    
    log "Generating environment file: $output_file"
    
    # Create secure temporary file
    local temp_file=$(mktemp)
    chmod 600 "$temp_file"
    
    # Write environment variables
    cat > "$temp_file" << EOF
# CastMatch ${env_type^} Environment Configuration
# Generated on $(date)
# WARNING: This file contains sensitive information

# Environment
NODE_ENV=${env_type}
PORT=5000
API_PREFIX=/api

# Domain Configuration
NEXT_PUBLIC_APP_URL=https://app.castmatch.com
NEXT_PUBLIC_API_URL=https://api.castmatch.com/api
NEXTAUTH_URL=https://app.castmatch.com

# Database Configuration
DATABASE_URL=postgresql://castmatch_user:$(get_aws_secret "database/password")@prod-db.castmatch.com:5432/castmatch_production

# Redis Configuration
REDIS_URL=redis://:$(get_aws_secret "redis/password")@prod-redis.castmatch.com:6379
REDIS_PASSWORD=$(get_aws_secret "redis/password")

# JWT Configuration
JWT_SECRET=$(get_aws_secret "jwt/secret")
NEXTAUTH_SECRET=$(get_aws_secret "nextauth/secret")

# OAuth Configuration
GOOGLE_CLIENT_ID=$(get_aws_secret "oauth/google/client-id")
GOOGLE_CLIENT_SECRET=$(get_aws_secret "oauth/google/client-secret")
GITHUB_CLIENT_ID=$(get_aws_secret "oauth/github/client-id")
GITHUB_CLIENT_SECRET=$(get_aws_secret "oauth/github/client-secret")

# Email Configuration
SMTP_PASSWORD=$(get_aws_secret "email/smtp/password")

# API Keys
INTERNAL_API_KEY=$(get_aws_secret "api/internal-key")

# Security Keys
BACKUP_ENCRYPTION_KEY=$(get_aws_secret "backup/encryption-key")
CSRF_SECRET_KEY=$(get_aws_secret "security/csrf-key")
SSL_BACKUP_PASSPHRASE=$(get_aws_secret "ssl/backup-passphrase")
EOF
    
    # Move to final location
    sudo mv "$temp_file" "$output_file"
    sudo chmod 600 "$output_file"
    sudo chown castmatch:castmatch "$output_file"
    
    log "Environment file generated: $output_file"
}

# Rotate secrets
rotate_secrets() {
    local secret_type="$1"
    
    log "Rotating secrets of type: $secret_type"
    
    case "$secret_type" in
        "jwt")
            local new_secret=$(generate_jwt_secret 64)
            store_aws_secret "jwt/secret" "$new_secret" "JWT signing secret (rotated)"
            ;;
        "database")
            local new_password=$(generate_password 32 false)
            store_aws_secret "database/password" "$new_password" "PostgreSQL production password (rotated)"
            log "WARNING: Database password rotated. Update database server and restart services."
            ;;
        "redis")
            local new_password=$(generate_password 32 false)
            store_aws_secret "redis/password" "$new_password" "Redis production password (rotated)"
            log "WARNING: Redis password rotated. Update Redis server and restart services."
            ;;
        "api")
            local new_key=$(generate_password 48 false)
            store_aws_secret "api/internal-key" "$new_key" "Internal API key (rotated)"
            ;;
        *)
            error_exit "Unknown secret type: $secret_type"
            ;;
    esac
    
    log "Secret rotation completed for: $secret_type"
}

# Backup secrets
backup_secrets() {
    local backup_dir="${1:-/opt/castmatch/secrets-backup/$(date '+%Y%m%d_%H%M%S')}"
    
    log "Backing up secrets to: $backup_dir"
    
    mkdir -p "$backup_dir"
    
    # Get list of all secrets
    local secrets=$(aws secretsmanager list-secrets \
        --query "SecretList[?starts_with(Name, '${SECRETS_MANAGER_PREFIX}/')].Name" \
        --output text)
    
    # Backup each secret
    for secret in $secrets; do
        local secret_name=$(basename "$secret")
        local secret_value=$(aws secretsmanager get-secret-value \
            --secret-id "$secret" \
            --query 'SecretString' \
            --output text)
        
        echo "$secret_value" > "${backup_dir}/${secret_name}.txt"
    done
    
    # Create encrypted archive
    tar -czf "${backup_dir}.tar.gz" -C "$backup_dir" .
    
    # Encrypt backup
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 \
        --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65011712 \
        --passphrase "$(get_aws_secret "backup/encryption-key")" --batch --yes \
        --output "${backup_dir}.tar.gz.gpg" "${backup_dir}.tar.gz"
    
    # Cleanup
    rm -rf "$backup_dir" "${backup_dir}.tar.gz"
    
    # Upload to S3
    aws s3 cp "${backup_dir}.tar.gz.gpg" "s3://castmatch-secrets-backup/"
    
    log "Secrets backup completed: ${backup_dir}.tar.gz.gpg"
}

# Health check for secrets
health_check() {
    log "Performing secrets health check..."
    
    local issues=0
    
    # Check AWS Secrets Manager connectivity
    if ! aws secretsmanager list-secrets --max-items 1 &> /dev/null; then
        log "ERROR: Cannot connect to AWS Secrets Manager"
        ((issues++))
    fi
    
    # Check Vault connectivity (if enabled)
    if [[ "${USE_VAULT:-false}" == "true" ]]; then
        if ! vault status &> /dev/null; then
            log "ERROR: Cannot connect to HashiCorp Vault"
            ((issues++))
        fi
    fi
    
    # Check critical secrets exist
    local critical_secrets=(
        "database/password"
        "redis/password"
        "jwt/secret"
        "nextauth/secret"
    )
    
    for secret in "${critical_secrets[@]}"; do
        if ! aws secretsmanager describe-secret --secret-id "${SECRETS_MANAGER_PREFIX}/${secret}" &> /dev/null; then
            log "ERROR: Critical secret missing: $secret"
            ((issues++))
        fi
    done
    
    if [[ $issues -eq 0 ]]; then
        log "Secrets health check passed"
        return 0
    else
        log "Secrets health check failed with $issues issues"
        return 1
    fi
}

# Main function
main() {
    local action="$1"
    shift
    
    check_dependencies
    
    case "$action" in
        "init-aws")
            init_aws_secrets
            ;;
        "init-vault")
            init_vault
            ;;
        "unseal-vault")
            unseal_vault
            ;;
        "setup")
            setup_production_secrets
            ;;
        "generate-env")
            generate_env_file "$@"
            ;;
        "store-aws")
            store_aws_secret "$@"
            ;;
        "get-aws")
            get_aws_secret "$@"
            ;;
        "store-vault")
            store_vault_secret "$@"
            ;;
        "get-vault")
            get_vault_secret "$@"
            ;;
        "rotate")
            rotate_secrets "$@"
            ;;
        "backup")
            backup_secrets "$@"
            ;;
        "health-check")
            health_check
            ;;
        "generate-password")
            generate_password "$@"
            ;;
        "generate-jwt")
            generate_jwt_secret "$@"
            ;;
        "generate-ssl")
            generate_ssl_cert "$@"
            ;;
        *)
            echo "Usage: $0 {init-aws|init-vault|unseal-vault|setup|generate-env|store-aws|get-aws|store-vault|get-vault|rotate|backup|health-check|generate-password|generate-jwt|generate-ssl}"
            echo ""
            echo "Examples:"
            echo "  $0 init-aws"
            echo "  $0 setup"
            echo "  $0 generate-env production /opt/castmatch/.env.production"
            echo "  $0 store-aws database/password 'secure-password'"
            echo "  $0 get-aws database/password"
            echo "  $0 rotate jwt"
            echo "  $0 backup"
            echo "  $0 health-check"
            exit 1
            ;;
    esac
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi