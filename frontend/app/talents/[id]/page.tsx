'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Phone, Mail, Globe, Award, Star, Heart, Share2, Download,
  Calendar, Clock, Languages, Briefcase, Height, Weight, Eye, Palette,
  ChevronLeft, ChevronRight, Play, ExternalLink, CheckCircle, Film
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TalentCard } from '@/components/talent/TalentCard'
import { useTalent, useSimilarTalents, useBookmarkTalent } from '@/hooks/use-talents'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function TalentProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const talentId = params.id as string

  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [showContactDialog, setShowContactDialog] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  // API hooks
  const { data: talent, isLoading, error } = useTalent(talentId)
  const { data: similarTalents } = useSimilarTalents(talentId, 6)
  const bookmarkMutation = useBookmarkTalent()

  // Handlers
  const handleBookmark = async () => {
    try {
      await bookmarkMutation.mutateAsync({
        id: talentId,
        bookmark: !isBookmarked,
      })
      setIsBookmarked(!isBookmarked)
      toast({
        title: isBookmarked ? 'Bookmark removed' : 'Bookmark added',
        description: isBookmarked
          ? 'Talent removed from your bookmarks'
          : 'Talent added to your bookmarks',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update bookmark',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: talent?.name,
        text: `Check out ${talent?.name}'s profile on CastMatch`,
        url: window.location.href,
      })
    } catch (error) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Link copied',
        description: 'Profile link copied to clipboard',
      })
    }
  }

  const handleContact = () => {
    setShowContactDialog(true)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-96 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !talent) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load talent profile. Please try again later.
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const allImages = [talent.profileImage, ...(talent.images || [])].filter(Boolean)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handleBookmark}>
                <Heart className={cn('w-4 h-4', isBookmarked && 'fill-red-500 text-red-500')} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Section */}
            <Card>
              <CardContent className="p-0">
                <div className="relative">
                  {/* Image Gallery */}
                  <div className="relative aspect-[16/9] bg-gray-100">
                    {allImages.length > 0 ? (
                      <>
                        <Image
                          src={allImages[selectedImageIndex] || ''}
                          alt={talent.name}
                          fill
                          className="object-cover cursor-pointer"
                          onClick={() => setShowGallery(true)}
                        />
                        {allImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setSelectedImageIndex(Math.min(allImages.length - 1, selectedImageIndex + 1))}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                              {allImages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSelectedImageIndex(index)}
                                  className={cn(
                                    'w-2 h-2 rounded-full transition-colors',
                                    index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                                  )}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                        <span className="text-white text-6xl font-bold">
                          {talent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Basic Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                          {talent.name}
                          {talent.verified && <CheckCircle className="w-6 h-6" />}
                        </h1>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{talent.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{talent.rating.toFixed(1)} ({talent.reviewCount} reviews)</span>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleContact} size="lg">
                        Contact Now
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Section */}
            <Tabs defaultValue="about" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
              </TabsList>

              <TabsContent value="about" className="space-y-6">
                {/* Bio */}
                {talent.bio && (
                  <Card>
                    <CardHeader>
                      <CardTitle>About Me</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 leading-relaxed">{talent.bio}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Expertise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {talent.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Languages */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="w-5 h-5" />
                      Languages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {talent.languages.map((language) => (
                        <Badge key={language} variant="outline">
                          {language}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="experience" className="space-y-4">
                {talent.workExperience && talent.workExperience.length > 0 ? (
                  <div className="space-y-4">
                    {talent.workExperience.map((exp) => (
                      <Card key={exp.id}>
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">{exp.title}</h3>
                              <p className="text-gray-600">{exp.company} • {exp.role}</p>
                              {exp.description && (
                                <p className="text-gray-500 mt-2">{exp.description}</p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  {new Date(exp.startDate).toLocaleDateString()} -{' '}
                                  {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
                                </span>
                              </div>
                            </div>
                            {exp.current && (
                              <Badge variant="secondary">Current</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No work experience added yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                {talent.mediaGallery && talent.mediaGallery.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {talent.mediaGallery.map((media) => (
                      <Card key={media.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
                        <CardContent className="p-0">
                          <div className="relative aspect-square bg-gray-100">
                            {media.type === 'video' ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <Play className="w-12 h-12 text-gray-400" />
                              </div>
                            ) : (
                              <Image
                                src={media.thumbnail || media.url}
                                alt={media.title || 'Media'}
                                fill
                                className="object-cover"
                              />
                            )}
                            <Badge className="absolute top-2 right-2" variant="secondary">
                              {media.type}
                            </Badge>
                          </div>
                          {media.title && (
                            <div className="p-2">
                              <p className="text-sm font-medium line-clamp-1">{media.title}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No media uploaded yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                {talent.achievements && talent.achievements.length > 0 ? (
                  <div className="space-y-3">
                    {talent.achievements.map((achievement, index) => (
                      <Card key={index}>
                        <CardContent className="p-4 flex items-center gap-3">
                          <Award className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                          <p>{achievement}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-gray-500">
                      No achievements added yet
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={handleContact}>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Audition
                </Button>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Portfolio
                </Button>
              </CardContent>
            </Card>

            {/* Physical Attributes */}
            {talent.physicalAttributes && (
              <Card>
                <CardHeader>
                  <CardTitle>Physical Attributes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {talent.height && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Height className="w-4 h-4" />
                        Height
                      </span>
                      <span className="font-medium">{talent.height} cm</span>
                    </div>
                  )}
                  {talent.weight && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Weight className="w-4 h-4" />
                        Weight
                      </span>
                      <span className="font-medium">{talent.weight} kg</span>
                    </div>
                  )}
                  {talent.physicalAttributes.eyeColor && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Eye Color
                      </span>
                      <span className="font-medium">{talent.physicalAttributes.eyeColor}</span>
                    </div>
                  )}
                  {talent.physicalAttributes.hairColor && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Hair Color
                      </span>
                      <span className="font-medium">{talent.physicalAttributes.hairColor}</span>
                    </div>
                  )}
                  {talent.physicalAttributes.bodyType && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Body Type</span>
                      <span className="font-medium">{talent.physicalAttributes.bodyType}</span>
                    </div>
                  )}
                  {talent.physicalAttributes.ethnicity && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Ethnicity</span>
                      <span className="font-medium">{talent.physicalAttributes.ethnicity}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Availability Status */}
            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="capitalize">{talent.availability.replace('_', ' ')}</span>
                  <div className={cn(
                    'w-2 h-2 rounded-full ml-auto',
                    talent.availability === 'available' && 'bg-green-500',
                    talent.availability === 'busy' && 'bg-yellow-500',
                    talent.availability === 'not_available' && 'bg-red-500'
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Experience Level */}
            <Card>
              <CardHeader>
                <CardTitle>Experience Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{talent.experience}</span>
                    <Briefcase className="w-4 h-4 text-gray-500" />
                  </div>
                  <Progress
                    value={
                      talent.experience === 'beginner' ? 33 :
                      talent.experience === 'intermediate' ? 66 : 100
                    }
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Similar Talents */}
        {similarTalents && similarTalents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Similar Talents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {similarTalents.map((similarTalent) => (
                <TalentCard key={similarTalent.id} talent={similarTalent} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {talent.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{talent.email}</p>
              </div>
            </div>
            {talent.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{talent.phone}</p>
                </div>
              </div>
            )}
            <Button className="w-full" onClick={() => window.location.href = `mailto:${talent.email}`}>
              Send Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Gallery Modal */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl">
          <div className="relative aspect-video bg-gray-100">
            {allImages[selectedImageIndex] && (
              <Image
                src={allImages[selectedImageIndex]}
                alt={talent.name}
                fill
                className="object-contain"
              />
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2',
                    index === selectedImageIndex ? 'border-purple-500' : 'border-transparent'
                  )}
                >
                  <Image
                    src={image || ''}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}