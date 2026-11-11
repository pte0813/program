export const metadata = { title: "Posteady Lite", description: "개인용 SNS 마케팅 자동화" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#fafafa", color: "#111" }}>{children}</body>
    </html>
  );
}
