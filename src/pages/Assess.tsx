import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkillPicker } from '../components/SkillPicker';
import { useProfile } from '../context/ProfileContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { taxonomy } from '../model/catalog';
import { FOCUS_MAX, firstErrorStep, validateStep, type FieldErrors } from '../model/profile';

const STEP_TITLES = ['Interests', 'Skills', 'Education', 'Work style'];

export function AssessPage() {
  useDocumentTitle('Assessment · Career Roadmap');
  const navigate = useNavigate();
  const {
    ready,
    draft,
    toggleInterest,
    setSkill,
    setEducation,
    setStream,
    setFocusText,
    setPreference,
    submitDraft,
  } = useProfile();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [forceSkills, setForceSkills] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);

  if (!ready) {
    return (
      <div className="wrap page-block">
        <p role="status">Loading your saved answers…</p>
      </div>
    );
  }

  const showErrors = (next: FieldErrors) => {
    setErrors(next);
    if (next.skills) setForceSkills(true);
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const goNext = () => {
    const stepErrors = validateStep(draft, step);
    if (Object.keys(stepErrors).length > 0) {
      showErrors(stepErrors);
      return;
    }
    setErrors({});
    if (step < 3) {
      setStep(step + 1);
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      return;
    }
    const submitted = submitDraft();
    if (!submitted.ok) {
      showErrors(submitted.errors);
      setStep(firstErrorStep(submitted.errors));
      return;
    }
    navigate('/results');
  };

  const errorList = Object.values(errors);

  return (
    <div className="wrap page-block assess">
      <p className="kicker">Assessment</p>
      <h1>Build a profile the score can use.</h1>
      <p className="lead">
        Four short steps. You can go back and change anything before you see matches. Unrated skills count as no
        experience.
      </p>

      <ol className="stepper" aria-label="Assessment progress">
        {STEP_TITLES.map((title, index) => (
          <li key={title} aria-current={index === step ? 'step' : undefined}>
            <button
              type="button"
              disabled={index > step}
              onClick={() => {
                if (index < step) {
                  setErrors({});
                  setStep(index);
                }
              }}
            >
              <span>{index + 1}</span>
              {title}
            </button>
          </li>
        ))}
      </ol>
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }} />
      </div>

      {errorList.length > 0 ? (
        <div className="alert alert-error" role="alert" tabIndex={-1} ref={alertRef}>
          <p>Fix this before continuing.</p>
          <ul>
            {errorList.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 0 ? (
        <section aria-labelledby="step-interests">
          <h2 id="step-interests">Which themes sound like you?</h2>
          <p>Choose 2 to 8. These are themes, not job titles.</p>
          <div className="choice-grid">
            {taxonomy.interests.map((interest) => (
              <label key={interest.id} className="choice-card">
                <input
                  type="checkbox"
                  name="interest"
                  value={interest.id}
                  checked={draft.interests.includes(interest.id)}
                  onChange={() => toggleInterest(interest.id)}
                />
                <span className="choice-title">{interest.label}</span>
                <span className="choice-copy">{interest.description}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section aria-labelledby="step-skills">
          <h2 id="step-skills">How far along are you, honestly?</h2>
          <p>
            Rate what you have actually used. None is a fair answer. The score uses the gap between your rating and
            the depth a path lists, not a vague “I know it”.
          </p>
          <SkillPicker
            ratings={draft.skills}
            interests={draft.interests}
            onRate={setSkill}
            forceOpen={forceSkills}
          />
        </section>
      ) : null}

      {step === 2 ? (
        <section aria-labelledby="step-education">
          <h2 id="step-education">Education</h2>
          <p>Use the highest level you have finished or are in now. A degree you have started counts.</p>
          <fieldset className="choice-stack">
            <legend>Level</legend>
            {taxonomy.levels.map((level) => (
              <label key={level.id} className="choice-card choice-row">
                <input
                  type="radio"
                  name="educationLevel"
                  value={level.id}
                  checked={draft.educationLevel === level.id}
                  onChange={() => setEducation(level.id)}
                />
                <span>
                  <span className="choice-title">{level.label}</span>
                  <span className="choice-copy">{level.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="stream">Stream or broad field</label>
            <select
              id="stream"
              value={draft.stream}
              onChange={(event) => setStream(event.target.value)}
            >
              <option value="">Select a stream</option>
              {taxonomy.streams.map((stream) => (
                <option key={stream.id} value={stream.id}>
                  {stream.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="focus-text">What are you studying? Optional, and not used in the score.</label>
            <input
              id="focus-text"
              type="text"
              maxLength={FOCUS_MAX}
              value={draft.focusText}
              placeholder="Example: B.Tech, third year"
              onChange={(event) => setFocusText(event.target.value)}
            />
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section aria-labelledby="step-preferences">
          <h2 id="step-preferences">How do you want the work to feel?</h2>
          <p>Pick a leaning. “No preference” stays neutral in the score instead of pretending to be a perfect fit.</p>
          {taxonomy.preferences.map((question) => (
            <fieldset key={question.id} className="choice-stack">
              <legend>{question.prompt}</legend>
              <p className="field-help">{question.help}</p>
              <div className="choice-grid">
                {question.options.map((option) => (
                  <label key={option.id} className="choice-card">
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={draft.preferences[question.id] === option.id}
                      onChange={() => setPreference(question.id, option.id)}
                    />
                    <span className="choice-title">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </section>
      ) : null}

      <div className="sticky-actions">
        <button
          type="button"
          className="button button-secondary"
          data-testid="assess-back"
          disabled={step === 0}
          onClick={() => {
            setErrors({});
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          Back
        </button>
        <button type="button" className="button button-primary" data-testid="assess-next" onClick={goNext}>
          {step === 3 ? 'See my matches' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
