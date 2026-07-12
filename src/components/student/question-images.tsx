"use client";

import { QuestionImage } from "@/components/student/question-image";
import type { StoredQuestion } from "@/lib/storage/questions";
import { getQuestionImageUrls } from "@/lib/utils/question-images";

type Props = {
  question: Pick<StoredQuestion, "imageDataUrl" | "extraImageDataUrls">;
  alt?: string;
  thumbnail?: boolean;
  fill?: boolean;
  className?: string;
  imageClassName?: string;
};

export function QuestionImages({
  question,
  alt = "문제",
  thumbnail = false,
  fill,
  className,
  imageClassName = "object-contain",
}: Props) {
  const urls = getQuestionImageUrls(question);
  const visible = thumbnail ? urls.slice(0, 1) : urls;
  const extraCount = urls.length - 1;

  if (visible.length === 0) {
    return (
      <QuestionImage src="" alt={alt} fill={fill} className={imageClassName} />
    );
  }

  if (visible.length === 1) {
    return (
      <div className="relative">
        {thumbnail && extraCount > 0 ? (
          <span className="absolute right-2 top-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
            +{extraCount}
          </span>
        ) : null}
        <QuestionImage
          src={visible[0]!}
          alt={alt}
          fill={fill}
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div className={className ?? "space-y-2"}>
      {visible.map((url, index) => (
        <div key={`${url}-${index}`} className="relative">
          <span className="absolute left-2 top-2 z-10 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white">
            {index + 1}/{urls.length}
          </span>
          <QuestionImage
            src={url}
            alt={`${alt} ${index + 1}`}
            className={imageClassName}
          />
        </div>
      ))}
    </div>
  );
}
