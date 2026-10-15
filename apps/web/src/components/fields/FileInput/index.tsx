import { type FC, type ReactNode } from "react";
import { LuPaperclip, LuUpload, LuX } from "react-icons/lu";
import { useFieldContext } from "@context/form.context";
import { Control } from "@components/core/Control";
import { useFieldError } from "../field-error";

type Props = {
  label?: ReactNode;
  hint?: ReactNode;
  /** Main line of the drop zone, e.g. "Alege documente". */
  title: string;
  /** Second line, e.g. the accepted formats. */
  description?: string;
  accept?: string;
  /** Without multiple, a new pick replaces the current file. */
  multiple?: boolean;
};

export const FileInput: FC<Props> = ({
  label,
  hint,
  title,
  description,
  accept,
  multiple,
}) => {
  const field = useFieldContext<File[]>();
  const error = useFieldError();
  const files = field.state.value;

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    field.handleChange(
      multiple ? [...files, ...selected] : selected.slice(0, 1),
    );
    field.handleBlur();
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <Control.Label label={label} hint={hint} error={error}>
        <span className="border-divider hover:border-highlight/40 bg-pop flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors">
          <span className="bg-background flex size-9 items-center justify-center rounded-lg">
            <LuUpload className="size-4" />
          </span>
          <span>
            <span className="text-primary block text-sm font-medium">
              {title}
            </span>
            {description && (
              <span className="text-muted block text-xs">{description}</span>
            )}
          </span>
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleFiles}
          />
        </span>
      </Control.Label>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="border-divider bg-background flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
            >
              <LuPaperclip className="size-3.5" />
              <span className="max-w-48 truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Elimină ${file.name}`}
                onClick={() =>
                  field.handleChange(files.filter((_, i) => i !== index))
                }
              >
                <LuX className="text-muted hover:text-primary size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
