// src/app/room/[roomId]/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client"; // Import Socket

interface RoomPageProps {
  params: { roomId: string };
}

// Keep a reference to the socket outside the component to prevent
// re-connections on re-renders if it's not managed by state/effect.
// Or better, manage it with useState and useEffect for proper lifecycle.
// let socket: Socket | null = null; // Old approach, see below for better one

export default function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null); // Manage socket with state

  // Effect for initializing local media
  useEffect(() => {
    const startLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        if (mainVideoRef.current) {
          // Initially show local stream in main view
          mainVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices.", error);
        alert(
          `Error accessing media devices: ${
            error instanceof Error ? error.message : String(error)
          } Please ensure you have a camera and microphone connected and have granted permission.`
        );
      }
    };
    startLocalMedia();

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: runs once on mount

  // Effect for initializing and cleaning up socket connection
  useEffect(() => {
    // Initialize socket connection
    // The path MUST match the one in pages/api/socket.ts
    const newSocket = io({ path: "/api/socket_io" });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to Socket.IO server, client ID:", newSocket.id);
      // Client can now emit a 'join-room' event, for example
      // newSocket.emit('join-room', roomId, newSocket.id); // We'll do this in the next step
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("Disconnected from Socket.IO server:", reason);
    });

    // Cleanup function for when the component unmounts or socket changes
    return () => {
      console.log("Cleaning up socket connection...");
      newSocket.disconnect();
    };
  }, [roomId]); // Re-run if roomId changes, though typically it won't in a single session

  // ... rest of the component (JSX) remains the same for now ...
  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-orange-500 rounded-md mr-3 flex items-center justify-center font-bold text-sm">
            TT
          </div>
          <div>
            <h1 className="text-lg font-semibold">Tech Talks</h1>
            <p className="text-xs text-gray-400">
              Weekly Session - Room: {roomId}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <span className="mr-2 text-sm">
            Badal, al (You){" "}
            {socket?.id && `(SID: ${socket.id.substring(0, 5)})`}
          </span>
          <button className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
            <span className="w-2 h-2 bg-white rounded-full mr-1.5"></span>
            REC
          </button>
          <span className="ml-2 text-xs text-gray-400">Audio</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 p-4 gap-4 overflow-hidden">
        {/* Main Video Player */}
        <section className="flex-1 flex flex-col bg-black rounded-lg overflow-hidden relative">
          <video
            ref={mainVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 bg-red-500 p-1 rounded-full text-xs">
            🔇
          </div>
          <div className="absolute bottom-2 left-2 bg-gray-700 px-2 py-1 rounded-md text-xs">
            Badal, al (You)
          </div>
        </section>

        {/* Participant Thumbnails */}
        <aside className="w-1/5 min-w-[200px] flex flex-col gap-2 overflow-y-auto">
          <div className="aspect-video bg-gray-700 rounded-md flex items-center justify-center relative overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-1 left-1 bg-black bg-opacity-75 px-1.5 py-0.5 rounded text-xs">
              You (ldk)
            </span>
            <div className="absolute top-1 right-1 bg-red-500 p-0.5 rounded-full text-xs">
              🔇
            </div>
          </div>
          <div className="aspect-video bg-gray-700 rounded-md flex items-center justify-center relative">
            <span className="text-xs">Participant 2 (asd)</span>
            <div className="absolute top-1 right-1 bg-black bg-opacity-50 p-0.5 rounded-full text-xs">
              🎤
            </div>
          </div>
          <div className="aspect-video bg-gray-600 rounded-md flex items-center justify-center relative">
            <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
              AW
            </div>
            <span className="absolute bottom-1 left-1 bg-black bg-opacity-75 px-1.5 py-0.5 rounded text-xs">
              Anita W
            </span>
            <div className="absolute top-1 right-1 bg-red-500 p-0.5 rounded-full text-xs">
              🔇
            </div>
          </div>
        </aside>
      </main>

      {/* Controls Footer */}
      <footer className="flex items-center justify-between p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <button className="bg-red-500 p-3 rounded-lg">🎤 Mute</button>
          <button className="bg-gray-700 p-3 rounded-lg">📹 Stop Video</button>
          <button className="bg-gray-700 p-3 rounded-lg">...</button>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-700 p-3 rounded-lg">📤 Share</button>
          <button className="bg-gray-700 p-3 rounded-lg">...</button>
          <button className="bg-gray-700 p-3 rounded-lg">✋ Raise Hand</button>
          <button className="bg-gray-700 p-3 rounded-lg">😊 React</button>
        </div>
        <div className="flex gap-2">
          <button className="bg-gray-700 p-3 rounded-lg">💬 Chat</button>
          <button className="bg-gray-700 p-3 rounded-lg">
            👥 Participants
          </button>
          <button className="bg-red-500 p-3 rounded-lg">🚪 Leave</button>
        </div>
      </footer>
    </div>
  );
}
