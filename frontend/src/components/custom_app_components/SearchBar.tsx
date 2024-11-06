'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { IoLocationOutline, IoSearch, IoCloseSharp } from "react-icons/io5";
import { ImSpinner8 } from "react-icons/im";
import { useState, useEffect, useRef } from 'react';
import debounce from 'lodash.debounce';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { fetchSuggestions } from "../../app/services/api";

const formSchema = z.object({
  query: z.string().nonempty({
    message: "",
  }),
});

interface SearchBarProps {
  onSearch: (query: string) => void;
  recentre: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, recentre }) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      query: "",
    },
  });

  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsHistory, setSuggestionsHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const debouncedFetchSuggestions = debounce(async (query: string) => {
    const results: string[] = await fetchSuggestions(query);
    if (results.length === 0) {
      setSuggestions(["... no address found"]);
    } else {
      const normalizedResults = results.map(result => normalizeSuggestion(result));
      setSuggestions(normalizedResults);
    }
  }, 0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestionsHistory(suggestions);
        setSuggestions([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestions]);

  const normalizeSuggestion = (suggestion: string) => {
    return suggestion
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    form.setValue('query', query);
  
    if (query === '') {
      setSuggestions([]);
    } else {
      debouncedFetchSuggestions(query);
    }
  };

  const handleInputFocus = () => {
    if (suggestionsHistory.length > 0) {
      setSuggestions(suggestionsHistory);
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (onSearch) {
      const isValid = await form.trigger();
      if (!isValid) {
        return;
      }
  
      setLoading(true);
      try {
        await onSearch(values.query);
      } finally {
        setLoading(false);
        setSuggestions([]);
        setSuggestionsHistory([]);
      }
    }
  }

  return (
    <div className="absolute top-3 right-20 z-40">
      <div ref={searchRef} className="relative flex items-center w-full min-w-96 max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-center w-full">
            <FormField
              control={form.control}
              name="query"
              render={({ field }) => (
                <FormItem className="w-full">
                  <div className="relative w-full">
                    <FormControl>
                      <div className="flex items-center ">
                        <input
                          type="text"
                          className={`text-sm bg-white text-black w-full py-4 pl-6 pr-10 shadow-2xl outline-none ${suggestions.length > 0 ? 'rounded-t-2xl' : 'rounded-full'}`}
                          placeholder="Search OneMap"
                          {...field}
                          onChange={handleInputChange}
                          onFocus={handleInputFocus}
                          autoComplete="off"
                        />
                        <Button
                          type="submit"
                          variant="link"
                          size="icon"
                          className="group absolute right-8 mr-3 py-4 px-0 bg-transparent hover:text-blue-500"
                        >
                          {loading ? (
                            <ImSpinner8 className="text-gray-500 text-lg animate-spin transition-colors duration-300" />
                          ) : (
                            <IoSearch className="text-gray-500 text-lg transition-colors duration-300 group-hover:text-blue-500" />
                          )}
                        </Button>    
                        <Button
                          onClick={() => {
                            form.setValue('query', '');
                            setSuggestions([]);
                          }}
                          variant="link"
                          size="icon"
                          className="group absolute right-0 mr-3 py-4 px-0 bg-transparent hover:text-blue-500"
                        >
                          <IoCloseSharp className="text-gray-500 text-lg transition-colors duration-300 group-hover:text-blue-500" />
                        </Button>           
                      </div>
                    </FormControl>
                    {suggestions.length > 0 && (
                      <ul className="absolute bg-white border-t-[1px] border-gray-200 w-full rounded-b-2xl shadow-lg z-10 py-2">
                        {suggestions.map((suggestion, index) => {
                          const query = form.getValues('query').toLowerCase();
                          const lowerSuggestion = suggestion.toLowerCase();
                          const boldStartIndex = lowerSuggestion.indexOf(query);
                          const boldEndIndex = boldStartIndex + query.length;

                          return (
                            <li
                              key={index}
                              className="px-4 py-3 cursor-pointer hover:bg-gray-200 flex items-center text-sm text-black"
                              onClick={() => {
                                form.setValue('query', suggestion);
                                setSuggestions([]);
                                onSubmit({ query: suggestion });
                              }}
                            >
                              <IoLocationOutline className="mr-5 text-black" />
                              {boldStartIndex > -1 ? (
                                <span className="flex-1 truncate">
                                  {suggestion.substring(0, boldStartIndex)}
                                  <strong>{suggestion.substring(boldStartIndex, boldEndIndex)}</strong>
                                  {suggestion.substring(boldEndIndex)}
                                </span>
                              ) : (
                                <span className="flex-1 truncate">{suggestion}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </div>
  );
};

export default SearchBar;
