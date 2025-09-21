import * as React from "react";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { logoutUser } from "@/lib/firebase";
import { LogIn, LogOut, Menu } from "lucide-react";

export function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [, setLocation] = useLocation();
  const { userProfile, isAuthenticated, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Redirect to home page after logout
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
                I
              </div>
              <h1 className="text-xl font-bold text-foreground" data-testid="text-logo">I-TRACK</h1>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Professional Tracking System
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-features"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-about"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-contact"
              >
                Contact
              </button>
            </nav>

            {/* Auth Actions */}
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="w-8 h-8 animate-pulse bg-muted rounded" />
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-muted-foreground hidden sm:inline" data-testid="text-welcome">
                    Welcome, {userProfile?.firstName || 'User'}
                  </span>
                  <Button 
                    variant="outline" 
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
              
              {/* Mobile menu button */}
              <button 
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          {/* Close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8 mt-2">
            <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
              I
            </div>
            <h1 className="text-xl font-bold text-foreground">I-TRACK</h1>
          </div>

          {/* Mobile Navigation */}
          <nav className="space-y-4">
            <button
              onClick={() => {
                scrollToSection('features');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-3 px-4 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => {
                scrollToSection('about');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-3 px-4 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              About
            </button>
            <button
              onClick={() => {
                scrollToSection('contact');
                setIsMobileMenuOpen(false);
              }}
              className="block w-full text-left py-3 px-4 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Contact
            </button>
          </nav>

          {/* Mobile Auth Actions */}
          <div className="mt-8 pt-6 border-t border-border">
            {isLoading ? (
              <div className="w-full h-10 animate-pulse bg-muted rounded" />
            ) : isAuthenticated ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Welcome, {userProfile?.firstName || 'User'}
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => {
                  setIsAuthModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
}
