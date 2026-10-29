import React, { useState, useMemo } from "react";
import { Printer, QrCode, Search, Copy, Check, ExternalLink, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { QrCodeSvg } from "@/components/ui/QrCodeSvg";
import { useBikesStore } from "@/store/useBikesStore";
import { useUIStore } from "@/store/useUIStore";
import { createStandQRPayload, generateStandToken } from "@/utils/qr";

interface AdminQrCodesScreenProps {
  onNavigate: (route: string) => void;
}

export const AdminQrCodesScreen: React.FC<AdminQrCodesScreenProps> = ({ onNavigate }) => {
  const { stands } = useBikesStore();
  const { showToast } = useUIStore();

  const [selectedBuilding, setSelectedBuilding] = useState<"ALL" | "AB1" | "AB2" | "AB3">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter stands
  const filteredStands = useMemo(() => {
    return stands.filter((s) => {
      const matchBuilding = selectedBuilding === "ALL" || s.building === selectedBuilding;
      const matchQuery =
        !searchQuery.trim() ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.building.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBuilding && matchQuery;
    });
  }, [stands, selectedBuilding, searchQuery]);

  const handleCopyPayload = (standId: string) => {
    const payload = createStandQRPayload(standId);
    navigator.clipboard?.writeText(payload);
    setCopiedId(standId);
    showToast(`Copied QR payload for Stand ${standId}`, "success");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-28 animate-fade-in text-slate-100">
      {/* Non-print Header & Controls */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate("/campus")}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Return to campus"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black font-display text-white tracking-tight">
                  Stand QR Codes Admin Utility
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#1d4ed8]/30 border border-sky-400/40 text-sky-300">
                  150 Stands
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Print physical QR code placards and badges for all bicycle parking slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handlePrint}
              leftIcon={<Printer className="size-4" />}
              className="shadow-lg shadow-blue-900/40"
            >
              Print QR Badges ({filteredStands.length})
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <Card className="p-3 bg-slate-900/90 border-slate-700/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          {/* Building tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["ALL", "AB1", "AB2", "AB3"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBuilding(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedBuilding === b
                    ? "bg-[#1d4ed8] text-white shadow-md"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {b === "ALL" ? "All Stands (150)" : `${b} Grounds (50)`}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-56">
            <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stand (e.g. AB1-12)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </Card>
      </div>

      {/* Printable Grid of Stand QR Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-4 print:text-black">
        {filteredStands.map((stand) => {
          const payload = createStandQRPayload(stand.id);
          const token = generateStandToken(stand.id);
          const isCopied = copiedId === stand.id;

          return (
            <div
              key={stand.id}
              className="bg-white text-slate-900 rounded-2xl p-4 border-2 border-slate-300 shadow-md flex flex-col justify-between print:break-inside-avoid print:border-black print:shadow-none"
            >
              {/* Badge Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#1d4ed8] font-mono">
                    VIT Smart Bicycle
                  </span>
                  <h3 className="text-xl font-black font-display text-slate-900">
                    Stand {stand.id}
                  </h3>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {stand.building} Section &bull; Slot #{stand.slot}
                  </p>
                </div>

                <div className="size-7 rounded-lg bg-blue-50 text-[#1d4ed8] flex items-center justify-center font-mono font-bold text-xs border border-blue-200">
                  #{stand.slot}
                </div>
              </div>

              {/* QR Code Center View */}
              <div className="py-3 flex flex-col items-center justify-center">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-inner">
                  <QrCodeSvg value={payload} size={135} />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-600" />
                  <span>Token: {token.slice(0, 16)}...</span>
                </span>
              </div>

              {/* Badge Footer & Actions */}
              <div className="pt-2.5 border-t border-slate-200 text-center space-y-2">
                <p className="text-[10px] text-slate-600">
                  Scan with ParkShark app camera or press E in 3D campus
                </p>

                {/* Non-print action buttons */}
                <div className="print:hidden flex items-center justify-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyPayload(stand.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Copy QR JSON payload"
                  >
                    {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span>{isCopied ? "Copied" : "Copy Payload"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate(`/lock/${stand.id}`)}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1d4ed8] transition-colors"
                    title="Test scan in Lock Screen"
                  >
                    <ExternalLink className="size-3" />
                    <span>Test Scan</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
