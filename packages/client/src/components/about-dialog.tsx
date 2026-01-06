"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";

interface AboutDialogProps {
  onClose: () => void;
}

interface LibraryInfo {
  name: string;
  version: string;
  repository?: string;
  homepage?: string;
}

interface LicenseInfo {
  name: string;
  url: string;
}

interface LibrariesData {
  metadata: {
    generatedOn: string;
    totalPackages: number;
    approvedLicenses: number;
    flaggedLicenses: number;
  };
  licenses: Record<string, LibraryInfo[]>;
  approvedLicenses: LicenseInfo[];
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [librariesData, setLibrariesData] = useState<LibrariesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Detect if running in Electron
    const inElectron = !!(window as Window & typeof globalThis & { electronAPI?: { openExternal: (url: string) => Promise<void> } }).electronAPI || navigator.userAgent.includes("Electron");
    setIsElectron(inElectron);

    fetch("/libraries.json")
      .then((res) => res.json())
      .then((data) => {
        setLibrariesData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load libraries.json:", error);
        setLoading(false);
      });
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    if (isElectron) {
      e.preventDefault();
      // Use Electron's shell API to open the default browser
      const electronAPI = (window as Window & typeof globalThis & { electronAPI?: { openExternal: (url: string) => Promise<void> } }).electronAPI;
      if (electronAPI?.openExternal) {
        electronAPI.openExternal(url).catch((error) => {
          console.error("Failed to open URL:", error);
        });
      }
    }
    // If not in Electron, let the default link behavior handle it
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>About Open Notes</DialogTitle>
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
              Open Source Libraries & Licenses
            </h3>
            
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading library information...
              </div>
            ) : librariesData ? (
              <div className="space-y-4">
                {/* Metadata Summary */}
                <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Packages:</span>
                    <span className="font-semibold text-foreground">
                      {librariesData.metadata.totalPackages}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approved Licenses:</span>
                    <span className="font-semibold text-foreground">
                      {librariesData.metadata.approvedLicenses}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="font-semibold text-foreground">
                      {librariesData.metadata.generatedOn}
                    </span>
                  </div>
                </div>

                {/* Libraries by License */}
                <ScrollArea className="h-96 pr-4">
                  <div className="space-y-4">
                    {Object.entries(librariesData.licenses).map(([license, libraries]) => (
                      <div key={license}>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                            {license}
                          </span>
                          <span className="text-muted-foreground font-normal">
                            ({libraries.length} {libraries.length === 1 ? "package" : "packages"})
                          </span>
                          {librariesData.approvedLicenses && (
                            <a
                              href={librariesData.approvedLicenses.find(l => l.name === license)?.url}
                              onClick={(e) => handleLinkClick(e, librariesData.approvedLicenses.find(l => l.name === license)?.url || "")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline text-xs ml-auto flex items-center gap-1"
                              title="View license details"
                            >
                              📄 View License
                            </a>
                          )}
                        </h4>
                        <div className="space-y-2 ml-2">
                          {libraries.map((lib) => (
                            <div
                              key={`${lib.name}-${lib.version}`}
                              className="border border-border rounded-md p-2 bg-card text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-foreground">{lib.name}</span>
                                  <span className="text-muted-foreground ml-2">v{lib.version}</span>
                                </div>
                                {lib.homepage && (
                                  <a
                                    href={lib.homepage}
                                    onClick={(e) => handleLinkClick(e, lib.homepage!)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline shrink-0 cursor-pointer"
                                  >
                                    Website
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load library information
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
            Built with ❤️ using modern open source technologies
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
