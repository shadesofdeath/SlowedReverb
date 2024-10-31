import { AudioProcessor } from '@/components/audio-processor'
import { ThemeToggle } from '@/components/theme-toggle'
import { Music, Github } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">
              Slowed & Reverb
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="https://github.com/shadesofdeath" 
              target="_blank" 
              className="hover:bg-accent p-2 rounded-md transition-colors group"
              aria-label="GitHub Repository"
            >
              <Github className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        
        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text Section */}
          <div className="space-y-6">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Transform Your Music
            </h2>
            <p className="text-xl text-muted-foreground">
              Upload your audio file and create beautiful slowed & reverb versions with real-time preview
            </p>
          </div>
          
          {/* Audio Processor Section */}
          <div className="w-full">
            <div className="bg-accent/30 p-6 rounded-2xl shadow-xl">
              <AudioProcessor />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}