'use client';

// import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Skeleton,
} from '@heroui/react';
import {
  UserIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface UserProfileProps {
  onSettingsClick?: () => void;
  onHelpClick?: () => void;
  onUpgradeClick?: () => void;
}

export default function UserProfile({
  onSettingsClick,
  onHelpClick,
  onUpgradeClick,
}: UserProfileProps) {
  // const { user, isLoading } = useUser();
  const user = null; // Temporary for testing
  const isLoading = false;

  if (isLoading) {
    return (
      <div className="mt-auto border-t border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3 p-3">
          <Skeleton className="rounded-full">
            <div className="h-8 w-8 rounded-full bg-default-300"></div>
          </Skeleton>
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/4 rounded-full" />
            <Skeleton className="h-2 w-1/2 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mt-auto border-t border-gray-200 bg-white p-4">
        <Button
          as="a"
          href="/api/auth/login"
          variant="solid"
          color="primary"
          size="sm"
          startContent={<UserIcon className="h-4 w-4" />}
          className="w-full bg-primary-600 hover:bg-primary-700"
        >
          Sign In to Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t border-gray-200 bg-white p-4">
      <Dropdown placement="top-start" className="w-64">
        <DropdownTrigger>
          <button
            className="w-full flex items-center gap-3 p-3 rounded-full hover:bg-gray-50 transition-colors duration-200 group"
            aria-label="User menu"
          >
            <Avatar
              src={user.picture || undefined}
              name={user.name || 'User'}
              size="sm"
              className="flex-shrink-0"
              classNames={{
                base: 'bg-gradient-to-br from-teal-500 to-teal-600',
                name: 'text-white font-medium',
              }}
            />
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{user.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">Pro Plan • Authenticated</p>
            </div>
            <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
              <Cog6ToothIcon className="h-4 w-4" />
            </div>
          </button>
        </DropdownTrigger>

        <DropdownMenu
          aria-label="User actions"
          className="p-2"
          itemClasses={{
            base: 'rounded-full p-3',
          }}
        >
          <DropdownItem
            key="profile"
            startContent={<UserIcon className="h-4 w-4" />}
            className="hover:bg-gray-50"
            textValue={`${user.name} - ${user.email}`}
          >
            <div>
              <p className="font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </DropdownItem>

          <DropdownItem
            key="settings"
            startContent={<Cog6ToothIcon className="h-4 w-4" />}
            onPress={onSettingsClick}
            textValue="Settings"
          >
            Settings
          </DropdownItem>

          <DropdownItem
            key="help"
            startContent={<QuestionMarkCircleIcon className="h-4 w-4" />}
            onPress={onHelpClick}
            textValue="Help & Support"
          >
            Help & Support
          </DropdownItem>

          <DropdownItem
            key="upgrade"
            startContent={<SparklesIcon className="h-4 w-4" />}
            onPress={onUpgradeClick}
            className="text-amber-600"
            classNames={{
              base: 'bg-amber-50 hover:bg-amber-100',
              content: 'text-amber-700',
            }}
            textValue="Upgrade Plan"
          >
            Upgrade Plan
          </DropdownItem>

          <DropdownItem
            key="logout"
            startContent={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
            onPress={() => (window.location.href = '/api/auth/logout')}
            className="text-red-600"
            color="danger"
            textValue="Sign Out"
          >
            Sign Out
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}
