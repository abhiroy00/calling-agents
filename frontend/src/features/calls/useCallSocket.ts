import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { WS_URL } from "@/lib/constants";
import { upsertLiveCall, appendTranscript } from "./callsSlice";
import type { RootState } from "@/app/store";

export default function useCallSocket() {
  const dispatch = useDispatch();
  const token = useSelector((s: RootState) => s.auth.token);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    let stopped = false;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/calls/?token=${token}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "call.status") dispatch(upsertLiveCall(data));
          else if (data.type === "call.transcript") dispatch(appendTranscript(data));
        } catch {}
      };

      ws.onclose = (e) => {
        if (!stopped && e.code !== 1000) setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      stopped = true;
      wsRef.current?.close(1000);
    };
  }, [token, dispatch]);
}
