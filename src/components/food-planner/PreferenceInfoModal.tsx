
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, X, ThumbsUp, ThumbsDown } from "lucide-react";

interface PreferenceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PreferenceInfoModal({ isOpen, onClose }: PreferenceInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl sm:text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            Hogyan jelöld meg a preferenciáidat?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 max-h-[60vh] overflow-y-auto">
          {/* Szeretem */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 mb-1 sm:mb-2 text-sm sm:text-base">Szeretem</h3>
              <p className="text-green-700 text-xs sm:text-sm">
                Azokat az alapanyagokat jelöld meg, amelyeket szeretsz és szívesen fogyasztasz. Ezekből több receptet fogsz kapni.
              </p>
            </div>
          </div>

          {/* Kedvenc (Szív) */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-pink-50 rounded-lg border border-pink-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-pink-800 mb-1 sm:mb-2 text-sm sm:text-base">Kedvenc</h3>
              <p className="text-pink-700 text-xs sm:text-sm">
                A szív gombbal jelölheted ki azokat az alapanyagokat, amelyek a kedvenceid. Ezek az alapanyagok a lista elején jelennek meg, és automatikusan "Szeretem" besorolást kapnak.
              </p>
            </div>
          </div>

          {/* Nem szeretem / Allergia */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <ThumbsDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800 mb-1 sm:mb-2 text-sm sm:text-base">Nem szeretem / Allergia</h3>
              <p className="text-red-700 text-xs sm:text-sm">
                Azokat az alapanyagokat jelöld meg, amelyeket nem szeretsz, vagy amelyekre allergiád/intoleranciád van. Ezeket az alapanyagokat tartalmazó recepteket nem fogunk ajánlani.
              </p>
            </div>
          </div>

          {/* Semleges / Nem tudom */}
          <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1 sm:mb-2 text-sm sm:text-base">Semleges / Nem tudom</h3>
              <p className="text-gray-700 text-xs sm:text-sm">
                Ha nem jelölsz meg semmit egy alapanyagnál, azt semlegesnek tekintjük. Ezek az alapanyagok szerepelhetnek a receptekben, de nem fogjuk aktívan keresni őket.
              </p>
            </div>
          </div>

          {/* Fontos megjegyzés */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs sm:text-sm font-bold">!</span>
              </div>
              <div>
                <h4 className="font-semibold text-amber-800 mb-1 text-sm sm:text-base">Fontos megjegyzés</h4>
                <p className="text-amber-700 text-xs sm:text-sm">
                  Ha allergiád vagy intoleranciád van valamilyen alapanyagra, mindenképpen jelöld meg "Nem szeretem" gombbal, hogy biztonsan elkerüljük ezeket a receptekben.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2 sm:pt-4 sticky bottom-0 bg-white border-t border-gray-100">
          <Button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base w-full sm:w-auto"
          >
            Értem!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
