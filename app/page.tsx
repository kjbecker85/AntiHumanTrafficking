import Link from "next/link";

export default function HomePage() {
  return (
    <section className="card">
      <h1>Human Trafficking Case Support Platform (Prototype)</h1>
      <p>
        This frontend-first prototype follows your requirements draft and uses synthetic data only.
      </p>
      <p>
        Start with the priority feature:
        <Link href="/link-analysis"> Cork Board</Link>
      </p>
    </section>
  );
}
