"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Music, Download, Play, Pause, Upload } from 'lucide-react'
import { toast } from 'sonner'

export function AudioProcessor() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState([1])
  const [reverb, setReverb] = useState([0.5])
  
  const sourceNode = useRef<AudioBufferSourceNode | null>(null)
  const gainNode = useRef<GainNode | null>(null)
  const convolver = useRef<ConvolverNode | null>(null)
  const startTime = useRef<number>(0)
  const playbackPosition = useRef<number>(0)
  
  useEffect(() => {
    if (isPlaying) {
      updateAudioSettings()
    }
  }, [speed, reverb])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)()
      const arrayBuffer = await file.arrayBuffer()
      const decodedBuffer = await context.decodeAudioData(arrayBuffer)
      
      setAudioContext(context)
      setAudioBuffer(decodedBuffer)
      toast.success('Audio file loaded successfully!')
    } catch (error) {
      toast.error('Error loading audio file')
      console.error(error)
    }
  }

  const createReverbImpulse = (context: AudioContext, reverbTime: number) => {
    const sampleRate = context.sampleRate
    // Minimum reverb time of 0.01 seconds to prevent buffer creation error
    const safeReverbTime = Math.max(0.01, reverbTime)
    const length = Math.floor(sampleRate * safeReverbTime)
    const impulse = context.createBuffer(2, length, sampleRate)
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel)
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, safeReverbTime)
      }
    }
    
    return impulse
  }

  const updateAudioSettings = () => {
    if (!audioContext || !audioBuffer) return

    // Store current position
    if (sourceNode.current) {
      playbackPosition.current = (audioContext.currentTime - startTime.current) * speed[0]
      sourceNode.current.stop()
      sourceNode.current.disconnect()
    }

    // Create new audio nodes
    sourceNode.current = audioContext.createBufferSource()
    gainNode.current = audioContext.createGain()
    convolver.current = audioContext.createConvolver()

    // Configure source
    sourceNode.current.buffer = audioBuffer
    sourceNode.current.playbackRate.value = speed[0]

    // Configure reverb
    const reverbTime = reverb[0] * 3
    convolver.current.buffer = createReverbImpulse(audioContext, reverbTime)

    // Set dry/wet mix based on reverb value
    const dryGain = audioContext.createGain()
    const wetGain = audioContext.createGain()
    dryGain.gain.value = 1 - reverb[0]
    wetGain.gain.value = reverb[0]

    // Connect nodes with parallel dry/wet paths
    sourceNode.current.connect(dryGain)
    sourceNode.current.connect(convolver.current)
    convolver.current.connect(wetGain)
    dryGain.connect(audioContext.destination)
    wetGain.connect(audioContext.destination)

    // Start playback from stored position
    const offset = playbackPosition.current % audioBuffer.duration
    sourceNode.current.start(0, offset)
    startTime.current = audioContext.currentTime - (offset / speed[0])
  }

  const processAudio = () => {
    if (!audioContext || !audioBuffer) return
    
    playbackPosition.current = 0
    updateAudioSettings()
    setIsPlaying(true)
  }

  const stopAudio = () => {
    if (sourceNode.current) {
      sourceNode.current.stop()
      sourceNode.current.disconnect()
      setIsPlaying(false)
      playbackPosition.current = 0
    }
  }

  const downloadProcessedAudio = async () => {
    if (!audioContext || !audioBuffer) return

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length * (1 / speed[0]),
      audioBuffer.sampleRate
    )

    const source = offlineContext.createBufferSource()
    const dryGain = offlineContext.createGain()
    const wetGain = offlineContext.createGain()
    const newConvolver = offlineContext.createConvolver()

    source.buffer = audioBuffer
    source.playbackRate.value = speed[0]

    // Create reverb impulse
    const reverbTime = reverb[0] * 3
    newConvolver.buffer = createReverbImpulse(offlineContext, reverbTime)

    // Set dry/wet mix
    dryGain.gain.value = 1 - reverb[0]
    wetGain.gain.value = reverb[0]

    // Connect nodes with parallel dry/wet paths
    source.connect(dryGain)
    source.connect(newConvolver)
    newConvolver.connect(wetGain)
    dryGain.connect(offlineContext.destination)
    wetGain.connect(offlineContext.destination)

    source.start()

    try {
      const renderedBuffer = await offlineContext.startRendering()
      const blob = await bufferToWave(renderedBuffer, renderedBuffer.length)
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'processed-audio.wav'
      a.click()
      
      URL.revokeObjectURL(url)
      toast.success('Audio downloaded successfully!')
    } catch (error) {
      toast.error('Error processing audio')
      console.error(error)
    }
  }

  const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    const numOfChan = abuffer.numberOfChannels
    const length = len * numOfChan * 2 + 44
    const buffer = new ArrayBuffer(length)
    const view = new DataView(buffer)
    const channels = []
    let pos = 0
    let offset = 0

    // write WAVE header
    setUint32(0x46464952)                         // "RIFF"
    setUint32(length - 8)                         // file length - 8
    setUint32(0x45564157)                         // "WAVE"
    setUint32(0x20746d66)                         // "fmt " chunk
    setUint32(16)                                 // length = 16
    setUint16(1)                                  // PCM (uncompressed)
    setUint16(numOfChan)
    setUint32(abuffer.sampleRate)
    setUint32(abuffer.sampleRate * 2 * numOfChan) // avg. bytes/sec
    setUint16(numOfChan * 2)                      // block-align
    setUint16(16)                                 // 16-bit
    setUint32(0x61746164)                         // "data" - chunk
    setUint32(length - pos - 4)                   // chunk length

    // write interleaved data
    for(let i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i))

    while(pos < length) {
      for(let i = 0; i < numOfChan; i++) {
        let sample = Math.max(-1, Math.min(1, channels[i][offset]))
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0
        view.setInt16(pos, sample, true)
        pos += 2
      }
      offset++
    }

    return new Blob([buffer], { type: 'audio/wav' })

    function setUint16(data: number) {
      view.setUint16(pos, data, true)
      pos += 2
    }

    function setUint32(data: number) {
      view.setUint32(pos, data, true)
      pos += 4
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardContent className="p-6 space-y-6">
        <div className="flex flex-col items-center gap-4">
          <label 
            htmlFor="audio-upload" 
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary/50"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">
                Upload MP3 or WAV file
              </p>
            </div>
            <input
              id="audio-upload"
              type="file"
              accept=".mp3,.wav"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <div className="w-full space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Speed</label>
                <span className="text-sm text-muted-foreground">{speed[0].toFixed(2)}x</span>
              </div>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={0.5}
                max={1.5}
                step={0.01}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Reverb</label>
                <span className="text-sm text-muted-foreground">{(reverb[0] * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={reverb}
                onValueChange={setReverb}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              size="icon"
              disabled={!audioBuffer}
              onClick={isPlaying ? stopAudio : processAudio}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="default"
              disabled={!audioBuffer}
              onClick={downloadProcessedAudio}
              className="flex gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}