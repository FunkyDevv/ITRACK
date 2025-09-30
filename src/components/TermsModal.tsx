import * as React from "react";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

export default function TermsModal() {
  const { mustAcceptTerms, acceptTerms, userProfile } = useAuth();
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [hasReadTerms, setHasReadTerms] = React.useState(false);

  const handleAccept = async () => {
    if (!hasReadTerms) return;
    setIsAccepting(true);
    await acceptTerms();
    setIsAccepting(false);
  };

  if (!mustAcceptTerms) return null;

  return (
    <Modal isOpen={true} onClose={() => {}}>
      <ModalHeader>
        <h2 className="text-2xl font-bold">Terms & Conditions</h2>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          <p className="text-gray-700">
            Welcome {userProfile?.firstName}. Please carefully read and accept the terms and conditions below to continue using your ITRACK intern account.
          </p>

          <div className="h-64 overflow-y-auto p-4 border rounded bg-muted text-sm space-y-3">
            <div>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>By using the ITRACK intern management system, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use this system.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. User Responsibilities</h3>
              <p>As an intern user, you agree to:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Provide accurate and truthful information in all system entries</li>
                <li>Submit attendance records and time logs honestly and promptly</li>
                <li>Complete assigned tasks within specified deadlines</li>
                <li>Maintain professional conduct in all system interactions</li>
                <li>Keep your login credentials secure and not share them with others</li>
                <li>Report any system issues or discrepancies immediately</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Data Privacy and Security</h3>
              <p>We are committed to protecting your personal information. Your data will be:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Used solely for internship management and educational purposes</li>
                <li>Shared only with authorized supervisors and teachers</li>
                <li>Stored securely using industry-standard encryption</li>
                <li>Retained only for the duration of your internship program</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">4. Attendance and Time Tracking</h3>
              <p>You understand that:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>All attendance records are monitored and verified</li>
                <li>False or misleading time entries may result in disciplinary action</li>
                <li>Location tracking may be used to verify attendance when enabled</li>
                <li>Regular and punctual attendance is required for program completion</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">5. Task Management and Reporting</h3>
              <p>You agree to:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Complete all assigned tasks to the best of your ability</li>
                <li>Submit progress reports and documentation as requested</li>
                <li>Communicate challenges or concerns promptly to supervisors</li>
                <li>Maintain confidentiality of company information and projects</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">6. System Usage Guidelines</h3>
              <p>When using ITRACK, you must:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Use the system only for its intended purposes</li>
                <li>Not attempt to access unauthorized areas or data</li>
                <li>Not interfere with system functionality or other users' access</li>
                <li>Report any security vulnerabilities or bugs discovered</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">7. Disciplinary Actions</h3>
              <p>Violation of these terms may result in:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Warning notifications and mandatory retraining</li>
                <li>Temporary suspension of system access</li>
                <li>Removal from the internship program</li>
                <li>Academic consequences as determined by educational institution</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">8. Technical Support and Updates</h3>
              <p>The system may undergo updates and maintenance. Users will be notified of significant changes. Technical support is available through designated channels during business hours.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">9. Limitation of Liability</h3>
              <p>The ITRACK system is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from system use.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">10. Agreement Modifications</h3>
              <p>These terms may be updated periodically. Continued use of the system after changes constitutes acceptance of the new terms. Users will be notified of significant modifications.</p>
            </div>

            <div className="border-t pt-2 mt-4">
              <p className="text-xs text-muted-foreground">
                Last updated: September 26, 2025<br/>
                By clicking "I Accept," you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2 py-3">
            <Checkbox 
              id="terms-checkbox" 
              checked={hasReadTerms}
              onCheckedChange={(checked) => setHasReadTerms(checked as boolean)}
            />
            <label 
              htmlFor="terms-checkbox" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              I have read and understood the terms and conditions above, and I agree to abide by them during my internship.
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button 
              onClick={handleAccept} 
              disabled={isAccepting || !hasReadTerms}
              className="px-6 py-2"
            >
              {isAccepting ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Accepting...
                </>
              ) : (
                "I Accept"
              )}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
