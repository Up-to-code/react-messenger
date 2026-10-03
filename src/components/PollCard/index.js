import { ChartNoAxesColumn, Check } from "lucide-react";
import { useLocale } from "../../lib/i18n";

export default function PollCard({ poll, onVote }) {
  const { t } = useLocale();
  const total = poll.vote ? 1 : 0;
  return (
    <section
      className="poll-card"
      aria-label={`${t("poll")}: ${poll.question}`}
    >
      <div className="card-eyebrow">
        <ChartNoAxesColumn size={15} />
        {t("poll")}
      </div>
      <h3 dir="auto">{poll.question}</h3>
      <div className="poll-options">
        {poll.options.map((option) => (
          <button
            type="button"
            key={option.id}
            className={`poll-option ${poll.vote === option.id ? "voted" : ""}`}
            aria-label={t("vote", { option: option.label })}
            aria-pressed={poll.vote === option.id}
            onClick={() => onVote(option.id)}
          >
            <span
              className="poll-fill"
              style={{ width: poll.vote === option.id ? "100%" : "0%" }}
              aria-hidden="true"
            />
            <span dir="auto">{option.label}</span>
            <span>
              {poll.vote === option.id ? <Check size={16} /> : null}
              {total ? `${poll.vote === option.id ? "100" : "0"}%` : ""}
            </span>
          </button>
        ))}
      </div>
      <p>
        {t(total === 1 ? "voteSingular" : "votes", { count: total })} ·{" "}
        {t("pollHint")}
      </p>
    </section>
  );
}
