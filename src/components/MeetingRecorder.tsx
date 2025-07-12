import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Upload, 
  Settings,
  Clock,
  Users,
  FileText
} from "lucide-react";

const MeetingRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [participantCount, setParticipantCount] = useState(3);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const pauseRecording = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    intervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    // Here you would handle the recording processing
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Main Recording Control */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-2">Meeting Recorder</CardTitle>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary" className="gap-2">
              <Users className="w-4 h-4" />
              {participantCount} participants
            </Badge>
            <Badge variant="secondary" className="gap-2">
              <Clock className="w-4 h-4" />
              {formatTime(recordingTime)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recording Visualizer */}
          <div className="flex items-center justify-center py-8">
            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ${
              isRecording ? 'bg-gradient-hero shadow-glow' : 'bg-secondary'
            } transition-all duration-300`}>
              {isRecording ? (
                <div className="relative">
                  <Mic className="w-12 h-12 text-primary-foreground" />
                  {!isPaused && (
                    <div className="absolute inset-0 rounded-full border-4 border-primary-foreground/30 animate-pulse" />
                  )}
                </div>
              ) : (
                <Mic className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button 
                variant="record" 
                size="xl" 
                onClick={startRecording}
                className="gap-3"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                {isPaused ? (
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={resumeRecording}
                    className="gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Resume
                  </Button>
                ) : (
                  <Button 
                    variant="glass" 
                    size="lg" 
                    onClick={pauseRecording}
                    className="gap-2"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </Button>
                )}
                
                <Button 
                  variant="destructive" 
                  size="lg" 
                  onClick={stopRecording}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </div>
            )}
          </div>

          {/* Recording Options */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-border/50">
            <Button variant="ghost" size="sm" className="gap-2">
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Templates */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-lg">Meeting Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Client Scoping", icon: FileText, active: true },
              { name: "Technical Review", icon: Settings, active: false },
              { name: "Planning Session", icon: Users, active: false },
              { name: "Custom", icon: Upload, active: false },
            ].map((template, index) => (
              <Button
                key={index}
                variant={template.active ? "default" : "ghost"}
                className="h-auto p-4 flex-col gap-2"
              >
                <template.icon className="w-5 h-5" />
                <span className="text-xs">{template.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Transcript Preview */}
      {isRecording && (
        <Card className="bg-card/30 border-border/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
              Live Transcript
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background/50 rounded-lg p-4 min-h-32">
              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">John</Badge>
                  <span className="text-muted-foreground">
                    So we need to discuss the timeline for this project...
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Sarah</Badge>
                  <span className="text-muted-foreground">
                    I think we can deliver the first phase by end of month...
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">You</Badge>
                  <span className="text-muted-foreground animate-pulse">
                    That sounds reasonable, but we should also consider...
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MeetingRecorder;