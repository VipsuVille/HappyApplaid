import { RocketIcon, CheckCircleIcon, SaveIcon, HammerIcon, FileTextIcon, MailIcon } from 'lucide-react';
import { LoadingStatesProps, StatusText } from '@/types';
import { Progress } from '@/components/ui/progress';
import { ReactElement } from 'react';

const LoadingStates = ({ progress, stage }: LoadingStatesProps) => {
  // ✅ Lisää kaikki StatusText enum-arvot
  const statusIcon: Record<StatusText, ReactElement> = {
    [StatusText.UPLOADING]: (
      <RocketIcon className="h-20 w-20 text-indigo-600" />
    ),
    [StatusText.UPLOADED]: (
      <CheckCircleIcon className="h-20 w-20 text-indigo-600" />
    ),
    [StatusText.SAVING]: (
      <>
        <HammerIcon className="h-20 w-20 text-indigo-600 animate-bounce" />
        <SaveIcon className="h-20 w-20 text-indigo-600" />
      </>
    ),
    [StatusText.GENERATING]: (
      <HammerIcon className="h-20 w-20 text-indigo-600 animate-bounce" />
    ),
    // ✅ LISÄÄ NÄMÄ PUUTTUVAT:
    [StatusText.GENERATING_LETTER]: (
      <MailIcon className="h-20 w-20 text-indigo-600 animate-bounce" />
    ),
    [StatusText.SAVING_LETTER]: (
      <FileTextIcon className="h-20 w-20 text-indigo-600 animate-pulse" />
    ),
  };

  return (
    <div className="mt-32 flex flex-col justify-center items-center gap-5">
      {progress != null && progress >= 0 && progress <= 100 && (
        <div className="w-64">
          <Progress value={progress} className="h-4" />
          <p className="text-center mt-2">{progress}%</p>
        </div>
      )}
      {stage && statusIcon[stage]}
      <p className="text-indigo-600 animate-pulse">
        {stage ?? ''}
      </p>
    </div>
  );
};

export default LoadingStates;