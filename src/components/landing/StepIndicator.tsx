import { useBrand } from '@/hooks/useBrand';

interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  currentStep: number;
  steps: Step[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  const { getLogoForContext } = useBrand();
  const logo = getLogoForContext('login');

  return (
    <div className="w-full py-6 px-4">
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img 
          src={logo} 
          alt="Harmony Agro" 
          className="h-12 md:h-14 object-contain"
        />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-2 md:gap-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-sm md:text-base font-bold transition-all
                  ${currentStep === step.number
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : currentStep > step.number
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {String(step.number).padStart(2, '0')}
              </div>
              <span
                className={`
                  mt-2 text-xs md:text-sm font-medium text-center max-w-[80px] md:max-w-[100px]
                  ${currentStep === step.number
                    ? 'text-primary'
                    : currentStep > step.number
                      ? 'text-primary/70'
                      : 'text-muted-foreground'
                  }
                `}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  w-8 md:w-16 h-0.5 mx-2 md:mx-4 mt-[-20px]
                  ${currentStep > step.number
                    ? 'bg-primary'
                    : 'bg-muted'
                  }
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
