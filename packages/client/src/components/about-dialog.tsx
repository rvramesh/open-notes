"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AboutDialogProps {
  onClose: () => void;
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const libraries = [
    { name: "Next.js", version: "15.x", description: "React framework for production" },
    {
      name: "React",
      version: "19.x",
      description: "JavaScript library for building user interfaces",
    },
    { name: "TypeScript", version: "5.x", description: "Typed superset of JavaScript" },
    { name: "Tailwind CSS", version: "4.x", description: "Utility-first CSS framework" },
    { name: "Lexical", version: "Latest", description: "Extensible text editor framework" },
    { name: "Radix UI", version: "Latest", description: "Unstyled, accessible UI components" },
    { name: "Lucide React", version: "Latest", description: "Beautiful & consistent icon toolkit" },
    { name: "date-fns", version: "Latest", description: "Modern JavaScript date utility library" },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>About Second Brain</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(85vh-120px)] space-y-6">
          {/* Version Info */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Version Information</h3>
            <div className="bg-muted/50 rounded-md p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-mono text-foreground">1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Build:</span>
                <span className="font-mono text-foreground">2024.01.31</span>
              </div>
            </div>
          </div>

          {/* Libraries */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Open Source Libraries & Tools
            </h3>
            <div className="space-y-3">
              {libraries.map((lib) => (
                <div key={lib.name} className="border border-border rounded-md p-3 bg-card">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-medium text-sm text-foreground">{lib.name}</h4>
                    <span className="text-xs text-muted-foreground font-mono">{lib.version}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{lib.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
            Built with ❤️ using modern web technologies
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
