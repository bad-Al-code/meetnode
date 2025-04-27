import { EllipsisVertical, MicOff } from "lucide-react";

import { Button } from "./components/ui/button";

function App() {
  return (
    <div>
      <div className="flex divide-x-2 divide-neutral-100">
        <Button
          aria-label="Mute Microphone"
          className="rounded-r-none"
          size="icon"
          variant="destructive"
        >
          <MicOff />
        </Button>
        <Button
          aria-label="More Options"
          className="rounded-l-none"
          variant="destructive"
          size="icon"
        >
          <EllipsisVertical />
        </Button>
      </div>
    </div>
  );
}

export default App;
