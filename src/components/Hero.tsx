import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Brain, FileText, Zap, Play, ArrowRight } from "lucide-react";

interface HeroProps {
  onNavigate?: (view: "landing" | "dashboard") => void;
}

const Hero = ({ onNavigate }: HeroProps) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-secondary opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-gradient-hero opacity-20 blur-3xl rounded-full" />
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Navigation */}
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
              <Mic className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Reverbia
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">Pricing</Button>
            <Button variant="glass">Sign In</Button>
            <Button variant="hero" size="lg" onClick={() => onNavigate?.("dashboard")}>
              Get Started
            </Button>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center bg-card/20 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm text-muted-foreground">
              AI-Powered Meeting Intelligence
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Transform Conversations Into{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Actionable Intelligence
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Enable anyone to fully engage in important conversations while AI handles 
            recording, understanding, documentation, and follow-up automatically.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button variant="hero" size="xl" className="gap-3" onClick={() => onNavigate?.("dashboard")}>
              <Play className="w-5 h-5" />
              Start Free Trial
            </Button>
            <Button variant="glass" size="xl" className="gap-3">
              Watch Demo
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Trust Indicators */}
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by teams at forward-thinking companies
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-16">
          <Card className="bg-gradient-card border-border/50 hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mic className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Smart Recording</h3>
              <p className="text-sm text-muted-foreground">
                Automatic transcription with speaker identification
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">AI Understanding</h3>
              <p className="text-sm text-muted-foreground">
                Context-aware analysis of conversations and documents
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Auto Documentation</h3>
              <p className="text-sm text-muted-foreground">
                Generate SOWs, action plans, and technical specs
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50 hover:shadow-elevated transition-all duration-300">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-2">Instant Queries</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about any past conversation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Use Cases */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Perfect for Every Scenario</h2>
          <p className="text-muted-foreground mb-8">
            From client meetings to technical reviews, Reverbia adapts to your workflow
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Contractor-Client Scoping", desc: "Automatically generate SOWs and project specs from scoping calls" },
              { title: "Technical Briefings", desc: "Extract tasks, dependencies, and constraints from engineering meetings" },
              { title: "Grant Planning", desc: "Document research collaboration meetings for grant submissions" },
              { title: "Product Reviews", desc: "Generate feature specs from stakeholder discussions" },
              { title: "Hackathon Planning", desc: "Quick documentation for rapid product development" },
              { title: "Client Consultations", desc: "Professional documentation for service agreements" },
            ].map((useCase, index) => (
              <Card key={index} className="bg-card/50 border-border/30 hover:bg-card/70 transition-all duration-300">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{useCase.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-card rounded-2xl p-12 border border-border/50">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Meetings?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who trust Reverbia to handle their meeting intelligence
          </p>
          <Button variant="hero" size="xl" className="gap-3" onClick={() => onNavigate?.("dashboard")}>
            <Play className="w-5 h-5" />
            Start Your Free Trial
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;