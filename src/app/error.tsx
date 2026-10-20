"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-6xl">🌧️</p>
      <h1 className="mt-6 text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-stone-500">Please try again in a moment.</p>
      <button onClick={reset} className="btn-primary mt-8">Try again</button>
    </div>
  );
}
