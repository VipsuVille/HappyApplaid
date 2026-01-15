import { RocketIcon, CheckCircleIcon, SaveIcon, HammerIcon, FileTextIcon, MailIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ReactElement } from 'react';

export enum StatusText {
  UPLOADING = "Uploading...",
  UPLOADED = "Uploaded",
  SAVING = "Saving...",
  GENERATING = "Generating CV...",
  GENERATING_LETTER = "Generating Cover Letter...",
  SAVING_LETTER = "Saving Letter...",
}

interface LoadingStatesProps {
  progress?: number;
  stage?: StatusText;
}

const LoadingStates = ({ progress, stage }: LoadingStatesProps) => {
  const statusIcon: Record<StatusText, ReactElement> = {
    [StatusText.UPLOADING]: (
      <RocketIcon className="h-20 w-20 text-orange-500 animate-bounce" />
    ),
    [StatusText.UPLOADED]: (
      <CheckCircleIcon className="h-20 w-20 text-green-500" />
    ),
    [StatusText.SAVING]: (
      <>
        <HammerIcon className="h-20 w-20 text-orange-500 animate-bounce" />
        <SaveIcon className="h-20 w-20 text-orange-400" />
      </>
    ),
    [StatusText.GENERATING]: (
      <HammerIcon className="h-20 w-20 text-orange-500 animate-bounce" />
    ),
    [StatusText.GENERATING_LETTER]: (
      <MailIcon className="h-20 w-20 text-orange-500 animate-bounce" />
    ),
    [StatusText.SAVING_LETTER]: (
      <FileTextIcon className="h-20 w-20 text-orange-500 animate-pulse" />
    ),
  };

  return (
    <div className="mt-32 flex flex-col justify-center items-center gap-5">
      {progress != null && progress >= 0 && progress <= 100 && (
        <div className="w-64">
          <Progress value={progress} className="h-4 bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-amber-600 transition-all" 
              style={{ width: `${progress}%` }}
            />
          </Progress>
          <p className="text-center mt-2 text-gray-300 font-semibold">{progress}%</p>
        </div>
      )}
      {stage && statusIcon[stage]}
      <p className="text-orange-400 animate-pulse font-medium text-lg">
        {stage ?? ''}
      </p>
    </div>
  );
};

export default LoadingStates;