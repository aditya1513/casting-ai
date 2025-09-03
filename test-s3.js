require('dotenv').config();
const { S3Client, ListBucketsCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  const client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

  try {
    console.log('Testing AWS S3 connection...');
    
    // List buckets
    const listCommand = new ListBucketsCommand({});
    const { Buckets } = await client.send(listCommand);
    
    console.log('\n✅ Connection successful!');
    console.log('\nYour S3 buckets:');
    Buckets?.forEach(bucket => {
      console.log(`  - ${bucket.Name}`);
    });
    
    // Check if castmatch-media exists
    const bucketExists = Buckets?.some(b => b.Name === 'castmatch-media');
    
    if (!bucketExists) {
      console.log('\n⚠️  Bucket "castmatch-media" not found.');
      console.log('Creating bucket...');
      
      const createCommand = new CreateBucketCommand({
        Bucket: 'castmatch-media',
        CreateBucketConfiguration: {
          LocationConstraint: 'ap-south-1'
        }
      });
      
      await client.send(createCommand);
      console.log('✅ Bucket "castmatch-media" created successfully!');
    } else {
      console.log('\n✅ Bucket "castmatch-media" exists!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.name === 'CredentialsProviderError') {
      console.error('Check your AWS credentials in .env file');
    }
  }
}

testS3Connection();