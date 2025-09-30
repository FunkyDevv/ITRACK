import * as React from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/useAuth";
import { Users, TrendingUp, Shield, Rocket } from "lucide-react";

export default function Landing() {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect authenticated users to dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative bg-primary text-white py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" data-testid="text-hero-title">
                Track Progress.<br />
                <span className="text-blue-100">Manage Teams.</span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed" data-testid="text-hero-description">
                Streamline your team's workflow with I-TRACK's comprehensive tracking system designed for supervisors and interns.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-features-title">
                Everything You Need to Track Success
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-features-description">
                Built for modern teams, I-TRACK provides powerful tools for supervisors to manage interns and track project progress efficiently.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow" data-testid="card-feature-team-management">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <Users className="text-primary w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Team Management</h3>
                <p className="text-muted-foreground">
                  Efficiently manage supervisors and interns with role-based access controls and permissions.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow" data-testid="card-feature-progress-tracking">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="text-primary w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Progress Tracking</h3>
                <p className="text-muted-foreground">
                  Monitor project milestones and individual performance with detailed analytics and reports.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card p-8 rounded-lg border border-border hover:shadow-lg transition-shadow" data-testid="card-feature-secure-access">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="text-primary w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Secure Access</h3>
                <p className="text-muted-foreground">
                  Enterprise-grade security with encrypted data storage and secure authentication systems.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8" data-testid="text-about-title">
              Built for Modern Teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed" data-testid="text-about-description">
              I-TRACK is designed to bridge the gap between supervisors and interns, providing a comprehensive platform 
              for project management, progress tracking, and team collaboration. Our role-based system ensures that each 
              user has access to the tools and information they need to succeed.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8" data-testid="text-contact-title">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-contact-description">
              Join thousands of teams who trust I-TRACK to manage their projects and track their success.
            </p>
            <Button
              size="lg"
              onClick={() => setIsAuthModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:shadow-lg text-lg px-8 py-4"
              data-testid="button-contact-get-started"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Get Started Today
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center font-bold">
                I
              </div>
              <h3 className="text-xl font-bold text-foreground">I-TRACK</h3>
            </div>
            <p className="text-muted-foreground mb-4">Professional Tracking System for Modern Teams</p>
            <div className="flex justify-center space-x-6 mb-8">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-linkedin">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-github">
                <i className="fab fa-github"></i>
              </a>
            </div>
            <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
              <p>&copy; 2024 I-TRACK. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
