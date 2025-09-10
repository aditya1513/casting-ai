"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  Menu, 
  User, 
  Settings, 
  LogOut, 
  Film, 
  Home,
  Users,
  Calendar,
  Briefcase,
  Camera
} from "lucide-react"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
}

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (apiClient.isAuthenticated()) {
      try {
        const response = await apiClient.get("/auth/me")
        if (response.ok && response.data) {
          setUser(response.data)
        } else {
          setUser(null)
        }
      } catch (error) {
        setUser(null)
      }
    } else {
      setUser(null)
    }
    setIsLoading(false)
  }

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout")
      apiClient.clearAuthToken()
      setUser(null)
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      })
    }
  }

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Users },
    { href: "/projects", label: "Projects", icon: Film },
    { href: "/auditions", label: "Auditions", icon: Calendar },
  ]

  const userNavigation = [
    { 
      label: "Dashboard", 
      href: user?.role === "actor" 
        ? "/dashboard/actor" 
        : user?.role === "casting_director"
        ? "/dashboard/casting-director"
        : user?.role === "producer"
        ? "/dashboard/producer"
        : "/dashboard",
      icon: user?.role === "actor" ? Camera : user?.role === "producer" ? Briefcase : Users
    },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ]

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Film className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">CastMatch</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-indigo-600 ${
                    isActiveLink(link.href)
                      ? "text-indigo-600"
                      : "text-gray-700"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
            ) : user ? (
              <>
                {/* Desktop User Menu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                          <AvatarFallback>
                            {user.firstName[0]}{user.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                          <p className="text-xs text-indigo-600 font-medium mt-1">
                            {user.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {userNavigation.map((item) => {
                        const Icon = item.icon
                        return (
                          <DropdownMenuItem key={item.label} asChild>
                            <Link href={item.href} className="cursor-pointer">
                              <Icon className="mr-2 h-4 w-4" />
                              <span>{item.label}</span>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                      <div className="flex flex-col space-y-6 mt-6">
                        {/* User Info */}
                        <div className="flex items-center space-x-3 px-2">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                            <AvatarFallback>
                              {user.firstName[0]}{user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>

                        <nav className="flex flex-col space-y-2">
                          {navLinks.map((link) => {
                            const Icon = link.icon
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  isActiveLink(link.href)
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{link.label}</span>
                              </Link>
                            )
                          })}
                        </nav>

                        <div className="border-t pt-4">
                          <nav className="flex flex-col space-y-2">
                            {userNavigation.map((item) => {
                              const Icon = item.icon
                              return (
                                <Link
                                  key={item.label}
                                  href={item.href}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100"
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </Link>
                              )
                            })}
                            <button
                              onClick={() => {
                                handleLogout()
                                setIsMobileMenuOpen(false)
                              }}
                              className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 text-left w-full"
                            >
                              <LogOut className="h-4 w-4" />
                              <span>Log out</span>
                            </button>
                          </nav>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            ) : (
              <>
                {/* Auth Buttons */}
                <div className="hidden md:flex items-center space-x-3">
                  <Button variant="ghost" asChild>
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/signup">Get started</Link>
                  </Button>
                </div>

                {/* Mobile Menu for non-authenticated users */}
                <div className="md:hidden">
                  <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                      <div className="flex flex-col space-y-6 mt-6">
                        <nav className="flex flex-col space-y-2">
                          {navLinks.map((link) => {
                            const Icon = link.icon
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  isActiveLink(link.href)
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{link.label}</span>
                              </Link>
                            )
                          })}
                        </nav>

                        <div className="border-t pt-4 space-y-3">
                          <Button className="w-full" asChild>
                            <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                              Get started
                            </Link>
                          </Button>
                          <Button variant="outline" className="w-full" asChild>
                            <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                              Sign in
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}