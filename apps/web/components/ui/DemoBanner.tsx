export default function DemoBanner() {
  const text = "Concept Demo – Not Final Product";

  return (
    <>
      <div className="banner-container">
        <div className="marquee-content">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="marquee-item">
              <span className="dot"></span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .banner-container {
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          background-color: #0f172a; /* slate-900 */
          color: #f1f5f9; /* slate-100 */
          height: 36px;
          width: 100%;
          border-bottom: 1px solid #1e293b;
          z-index: 100;
        }

        .marquee-content {
          display: flex;
          white-space: nowrap;
          animation: marquee-slow 240s linear infinite;
          /* Menggunakan gap lebih konsisten daripada margin individual */
          gap: 20px;
        }

        .marquee-item {
          display: flex;
          align-items: center;
          /* Mencegah item menciut/berhimpitan */
          flex-shrink: 0;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #fbbf24;
          margin-right: 12px !important;
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
        }

        p {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 600;
          margin-left: 10px;
          opacity: 0.9;
        }

        @keyframes marquee-slow {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
          /* -50% digunakan agar loop terasa seamless jika konten cukup panjang */
        }
      `}</style>
    </>
  );
}
