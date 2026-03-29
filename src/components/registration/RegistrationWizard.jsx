import { useState } from 'react';
import StepBasicInfo from './StepBasicInfo';
import StepPhoneOTP from './StepPhoneOTP';
import StepIDDetails from './StepIDDetails';
import StepSelfie from './StepSelfie';
import StepIDInHand from './StepIDInHand';

const TOTAL_STEPS = 5;

const progressBarStyle = (pct) => ({
  height: '4px',
  background: `linear-gradient(to right, var(--green) ${pct}%, var(--border) ${pct}%)`,
  borderRadius: '2px',
  marginBottom: '8px',
});

export default function RegistrationWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', role: 'user',
    idType: '', idNumber: '', dob: '', idName: '', expiryDate: '',
    selfieUrl: '', idInHandUrl: '', consentAt: null,
  });
  const [wizardToken, setWizardToken] = useState(null);
  const [errors, setErrors] = useState({});

  const onNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const onBack = () => setStep((s) => Math.max(s - 1, 1));

  const pct = Math.round((step / TOTAL_STEPS) * 100);

  const stepProps = {
    formData,
    setFormData,
    wizardToken,
    setWizardToken,
    onNext,
    onBack,
    errors,
    setErrors,
    onComplete,
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepBasicInfo {...stepProps} />;
      case 2: return <StepPhoneOTP {...stepProps} />;
      case 3: return <StepIDDetails {...stepProps} />;
      case 4: return <StepSelfie {...stepProps} />;
      case 5: return <StepIDInHand {...stepProps} />;
      default:
        return (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px 0' }}>
            Step {step} — coming soon
          </div>
        );
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto', padding: '0 16px' }}>
      {/* Progress */}
      <div style={{ marginBottom: '24px' }}>
        <div style={progressBarStyle(pct)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{pct}%</span>
        </div>
      </div>

      {renderStep()}
    </div>
  );
}
