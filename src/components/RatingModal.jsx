import { useState } from 'react';

export default function RatingModal({ movie, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    onSubmit(movie.id, rating, comment); 
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="text-xl font-semibold">{movie.title}</h2>
        <div className="rating">
          <input
            type="number"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            min="1"
            max="5"
          />
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your review here"
        ></textarea>
        <button onClick={handleSubmit}>Submit Review</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}