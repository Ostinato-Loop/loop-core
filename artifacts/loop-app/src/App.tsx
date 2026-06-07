import { Switch, Route, Router as WouterRouter, useParams, useSearch } from "wouter";
import { useAuth } from "./hooks/useAuth";
import Onboarding from "./components/Onboarding";
import RoomBrowser from "./pages/RoomBrowser";
import RoomPage from "./pages/RoomPage";
import LiveRoom from "./pages/LiveRoom";
import CreateRoom from "./pages/CreateRoom";
import { type RoomRole } from "./hooks/useLiveRoom";

function RoomRoute() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  if (!user) return null;
  return <RoomPage roomId={decodeURIComponent(params.id ?? "")} user={user} />;
}

function LiveRoomRoute() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const { user } = useAuth();
  const role = (new URLSearchParams(search).get("role") as RoomRole) ?? "listener";
  if (!user) return null;
  return <LiveRoom roomId={decodeURIComponent(params.id ?? "")} user={user} role={role} />;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#060D0A" }}>
      <div style={{ textAlign: "center", gap: "1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(62,222,114,0.1)", border: "1px solid rgba(62,222,114,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
          🎙️
        </div>
        <span className="spinner" style={{ width: 24, height: 24 }} />
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading, register } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Onboarding onComplete={register} />;

  return (
    <Switch>
      <Route path="/" component={() => <RoomBrowser user={user} />} />
      <Route path="/start" component={() => <CreateRoom user={user} />} />
      <Route path="/room/:id/live" component={LiveRoomRoute} />
      <Route path="/room/:id" component={RoomRoute} />
      <Route component={() => (
        <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center", background: "#060D0A" }}>
          <span style={{ fontSize: 36 }}>🤷</span>
          <h2 style={{ fontWeight: 700 }}>Nothing here</h2>
          <a href="/" style={{ color: "var(--loop-green)", fontWeight: 600, textDecoration: "none" }}>← Back to Loop</a>
        </div>
      )} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppRoutes />
    </WouterRouter>
  );
}
