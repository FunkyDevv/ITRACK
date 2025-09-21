import * as React from "react";
import { Modal, ModalHeader, ModalContent } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function TermsModal() {
  const { mustAcceptTerms, acceptTerms, userProfile } = useAuth();
  const [isAccepting, setIsAccepting] = React.useState(false);

  const handleAccept = async () => {
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
          <p>
            Welcome {userProfile?.firstName}. Please read and accept the terms and conditions to continue using your intern account.
          </p>

          <div className="h-40 overflow-y-auto p-2 border rounded bg-muted">
            <p className="text-sm">(Insert terms and conditions here. This is a placeholder.)</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? "Accepting..." : "I Accept"}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
