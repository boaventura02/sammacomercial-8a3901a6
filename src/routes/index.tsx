import { createFileRoute } from '@tanstack/react-router'
import { HeroSection } from '@/components/HeroSection'
import { Navbar } from '@/components/Navbar'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="bg-hero-bg min-h-screen">
      <Navbar />
      <HeroSection />
    </div>
  )
}
