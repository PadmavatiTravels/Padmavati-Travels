
import React, { useState, useRef, KeyboardEvent } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { addDestination, addArticleType } from "@/store/bookingSlice";

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  addNewItemType?: "destination" | "articleType";
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  label,
  addNewItemType,
  disabled = false,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddNew = () => {
    if (!inputValue.trim()) return;
    
    if (addNewItemType === "destination") {
      dispatch(addDestination(inputValue.trim()));
    } else if (addNewItemType === "articleType") {
      dispatch(addArticleType(inputValue.trim()));
    }
    
    onChange(inputValue.trim());
    setOpen(false);
    setInputValue("");
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !options.includes(inputValue) && inputValue.trim() !== "") {
      e.preventDefault();
      handleAddNew();
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground"
            )}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Search or add new..." 
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleInputKeyDown}
              ref={inputRef}
            />
            
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() !== "" && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start border-t py-3 h-auto"
                    onClick={handleAddNew}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{inputValue}"
                  </Button>
                )}
                {inputValue.trim() === "" && "No results found."}
              </CommandEmpty>
              <CommandGroup>
                {options
                  .filter(option => 
                    option.toLowerCase().includes(inputValue.toLowerCase())
                  )
                  .map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={(currentValue) => {
                        onChange(currentValue);
                        setOpen(false);
                        setInputValue("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
