import * as React from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  ArrowLeft,
} from "lucide-react";
import { db } from "@/lib/firebase";

export default function InternReportsPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation('/')}
            className="flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Intern Reports
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and manage reports submitted by your interns
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}