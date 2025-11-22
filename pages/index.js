export default function Home() {
  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#ffffff",
      fontFamily: "sans-serif"
    }}>
      <img src="/logo.png" alt="Snow Explorer" style={{ width: 180, marginBottom: 20 }} />
      <h1>Snow Explorer arrive bientôt</h1>
    </div>
  );
}
