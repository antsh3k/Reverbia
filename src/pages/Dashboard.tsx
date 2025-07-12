import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Mic, 
  Search, 
  Calendar, 
  FileText, 
  Clock, 
  Users, 
  Play,
  MoreVertical,
  Download,
  Share,
  Archive
} from "lucide-react";
import MeetingRecorder from "@/components/MeetingRecorder";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("recent");

  const recentMeetings = [
    {
      id: 1,
      title: "Client Scoping Call - E-commerce Platform",
      date: "2024-01-15",
      duration: "45:32",
      participants: ["John Smith", "Sarah Connor", "You"],
      type: "Client Scoping",
      status: "Processed",
      tags: ["SOW Generated", "Action Items"]
    },
    {
      id: 2,
      title: "Technical Review - Robot End-Effector",
      date: "2024-01-14",
      duration: "1:12:15",
      participants: ["Dr. Wilson", "Team Lead", "You"],
      type: "Technical Review",
      status: "Processing",
      tags: ["Test Plan", "Dependencies"]
    },
    {
      id: 3,
      title: "Grant Planning Session",
      date: "2024-01-12",
      duration: "38:21",
      participants: ["Prof. Anderson", "Research Team", "You"],
      type: "Planning",
      status: "Processed",
      tags: ["Timeline", "Budget"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                  Reverbia
                </span>
              </div>
              <nav className="hidden md:flex items-center space-x-6">
                <Button 
                  variant={activeTab === "recent" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("recent")}
                >
                  Recent Meetings
                </Button>
                <Button 
                  variant={activeTab === "record" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("record")}
                >
                  Record New
                </Button>
                <Button 
                  variant={activeTab === "templates" ? "default" : "ghost"} 
                  onClick={() => setActiveTab("templates")}
                >
                  Templates
                </Button>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search meetings..." 
                  className="pl-10 w-64 bg-background/50"
                />
              </div>
              <Button variant="hero" className="gap-2">
                <Mic className="w-4 h-4" />
                New Recording
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {activeTab === "record" ? (
          <MeetingRecorder />
        ) : activeTab === "recent" ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-sm text-muted-foreground">Total Meetings</p>
                    </div>
                    <Calendar className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">8.5h</p>
                      <p className="text-sm text-muted-foreground">Total Duration</p>
                    </div>
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">24</p>
                      <p className="text-sm text-muted-foreground">Documents Generated</p>
                    </div>
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">36</p>
                      <p className="text-sm text-muted-foreground">Active Participants</p>
                    </div>
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Meetings */}
            <Card className="bg-card/50 border-border/30">
              <CardHeader>
                <CardTitle>Recent Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentMeetings.map((meeting) => (
                    <div 
                      key={meeting.id} 
                      className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30 hover:bg-background/70 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{meeting.title}</h3>
                          <Badge variant={meeting.status === "Processed" ? "secondary" : "outline"}>
                            {meeting.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {meeting.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {meeting.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {meeting.participants.length} participants
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {meeting.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Play className="w-4 h-4" />
                          Review
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Export
                        </Button>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Templates Coming Soon</h2>
            <p className="text-muted-foreground">
              Customizable templates for different meeting types will be available here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;