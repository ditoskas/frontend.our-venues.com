import { Hero } from '@/components/invitation/Hero'
import { Countdown } from '@/components/invitation/Countdown'
import { StorySection } from '@/components/invitation/StorySection'

export function InvitationPage() {
  return (
    <div className="animate-fade-in">
      <Hero />
      <Countdown />
      <StorySection />
    </div>
  )
}
