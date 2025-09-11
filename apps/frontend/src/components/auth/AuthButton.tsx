'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Button, User, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { UserIcon, ArrowRightOnRectangleIcon, CogIcon } from '@heroicons/react/24/outline';

export default function AuthButton() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <Button isLoading variant="bordered" className="border-primary-600 text-primary-600" />;
  }

  if (!user) {
    return (
      <Button
        as="a"
        href="/api/auth/login"
        variant="solid"
        color="primary"
        startContent={<UserIcon className="h-4 w-4" />}
        className="bg-primary-600 hover:bg-primary-700"
      >
        Sign In
      </Button>
    );
  }

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button variant="light" className="p-0 h-auto data-[hover=true]:bg-transparent">
          <User
            name={user.name}
            description={user.email}
            avatarProps={{
              src: user.picture || undefined,
              showFallback: true,
              fallback: <UserIcon className="h-4 w-4" />,
              className: 'h-8 w-8',
            }}
            className="transition-opacity hover:opacity-80"
            classNames={{
              name: 'text-sm font-semibold text-white',
              description: 'text-xs text-slate-400',
            }}
          />
        </Button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="User menu"
        className="w-60"
        itemClasses={{
          base: 'gap-4',
        }}
      >
        <DropdownItem key="profile" className="h-14 gap-2" textValue={user.name || 'User Profile'}>
          <User
            name={user.name}
            description={user.email}
            avatarProps={{
              src: user.picture || undefined,
              showFallback: true,
              fallback: <UserIcon className="h-4 w-4" />,
              className: 'h-10 w-10',
            }}
            classNames={{
              name: 'text-sm font-semibold',
              description: 'text-xs',
            }}
          />
        </DropdownItem>

        <DropdownItem
          key="settings"
          startContent={<CogIcon className="h-4 w-4" />}
          textValue="Settings"
        >
          Settings
        </DropdownItem>

        <DropdownItem
          key="logout"
          startContent={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
          className="text-danger"
          color="danger"
          textValue="Sign Out"
          onPress={() => (window.location.href = '/api/auth/logout')}
        >
          Sign Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
