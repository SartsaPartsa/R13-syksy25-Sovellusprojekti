import { useState } from 'react';

export default function RatingModal({ movie, initialRating = 0, initialText = '', onClose, onSubmit }) {
  const [rating, setRating] = useState(initialRating);
  const [text, setText] = useState(initialText);

  const handleSubmit = () => onSubmit?.({ rating, text });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-5 ring-1 ring-white/10">
        <h2 className="text-xl font-semibold text-white mb-3">{movie?.title}</h2>

        <label className="block text-sm text-white/80 mb-1">Rating (1–5)</label>
        <input
          type="number" min={1} max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-24 rounded bg-gray-800 text-white px-2 py-1 mb-3"
        />

        <label className="block text-sm text-white/80 mb-1">Review</label>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded bg-gray-800 text-white p-2"
          placeholder="Write your review..."
        />

        <div className="mt-4 flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">Close</button>
          <button onClick={handleSubmit} className="px-3 py-2 rounded bg-[#F18800] text-black font-medium">Submit</button>
        </div>
      </div>
    </div>
  );
}
