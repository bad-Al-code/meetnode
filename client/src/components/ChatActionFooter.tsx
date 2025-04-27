import {
  EllipsisVertical,
  Hand,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  ScreenShare,
  Smile,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import { IconButtonGroup } from "./IconButtonGroup";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface ChatActionFooterProps {
  isMicMuted?: boolean;
  isCameraOff?: boolean;
  participantCount?: number;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onScreenShare?: () => void;
  onRaiseHand?: () => void;
  onReaction?: () => void;
  onLeave?: () => void;
  onChat?: () => void;
  onParticipants?: () => void;
  onMenu?: () => void;
  onMicOptions?: () => void;
  onCameraOptions?: () => void;
  onScreenShareOptions?: () => void;
  onLeaveOptions?: () => void;
  className?: string;
}

export const ChatActionFooter: React.FC<ChatActionFooterProps> = ({
  isMicMuted = false,
  isCameraOff = false,
  participantCount = 3,
  onToggleMic,
  onToggleCamera,
  onScreenShare,
  onRaiseHand,
  onReaction,
  onLeave,
  onChat,
  onParticipants,
  onMenu,
  onMicOptions,
  onCameraOptions,
  onScreenShareOptions,
  onLeaveOptions,
  className,
}) => {
  const MicIcon = isMicMuted ? MicOff : Mic;
  const VideoIcon = isCameraOff ? VideoOff : Video;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between p-3 sm:p-4",
        className
      )}
    >
      <div className="flex flex-shrink-0 gap-1 sm:gap-2">
        <IconButtonGroup
          labelLeft={isMicMuted ? "Unmute" : "Mute"}
          iconLeft={MicIcon}
          labelRight="Microphone Options"
          iconRight={EllipsisVertical}
          // variant={isMicMuted ? "destructive" : "ghost"}
          onClickLeft={onToggleMic}
          onClickRight={onMicOptions}
          separatorColor={
            isMicMuted ? "divide-neutral-100" : "divide-neutral-300"
          }
          separatorWidth={isMicMuted ? "divide-x-1" : "divide-x"}
        />

        <IconButtonGroup
          labelLeft={isCameraOff ? "Start Camera" : "Stop Camera"}
          iconLeft={VideoIcon}
          labelRight="Camera Options"
          iconRight={EllipsisVertical}
          variant="ghost"
          onClickLeft={onToggleCamera}
          onClickRight={onCameraOptions}
          separatorColor="divide-neutral-100"
          separatorWidth="divide-x"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mx-2">
        <IconButtonGroup
          labelLeft="Share Screen"
          labelRight="Screen Share Options"
          iconLeft={ScreenShare}
          iconRight={EllipsisVertical}
          variant="ghost"
          onClickLeft={onScreenShare}
          onClickRight={onScreenShareOptions}
          separatorColor="divide-neutral-100"
          separatorWidth="divide-x"
        />

        <IconButtonGroup
          variant="ghost"
          labelLeft="Raise Hand"
          labelRight="Reactions"
          iconLeft={Hand}
          iconRight={Smile}
          onClickLeft={onRaiseHand}
          onClickRight={onReaction}
          separatorColor="divide-neutral-100"
          separatorWidth="divide-x"
        />

        {/* Option 2: Separate (Uncomment if preferred) */}
        {/* <Button size="icon" variant="ghost" aria-label="Raise Hand" onClick={onRaiseHand}>
            <Hand />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Reactions" onClick={onReaction}>
             <Smile />
        </Button> */}

        <IconButtonGroup
          labelLeft="Leave Meeting"
          labelRight="Leave Options"
          iconLeft={LogOut}
          iconRight={EllipsisVertical}
          // variant="ghost"
          onClickLeft={onLeave}
          onClickRight={onLeaveOptions}
          separatorColor="divide-neutral-100"
          separatorWidth="divide-x"
        />
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        <Button size="icon" variant="ghost" aria-label="Chat" onClick={onChat}>
          <MessageSquare />
        </Button>

        <Button
          variant="ghost"
          className="flex items-center gap-1 px-2"
          onClick={onParticipants}
        >
          <Users className="h-5 w-5" />
          {participantCount > 0 && <span>{participantCount}</span>}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Menu" onClick={onMenu}>
          <Menu />
        </Button>
      </div>
    </div>
  );
};
