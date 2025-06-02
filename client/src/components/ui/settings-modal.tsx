import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Input } from "./input";
import { Button } from "./button";

/**
 * Modal for configuring the Nevermined API Key.
 * Allows the user to set and persist the API Key in localStorage.
 * Validates the API Key by calling /api/credit before saving.
 * @component
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Function to call when closing the modal
 * @param {function} [onApiKeySaved] - Function to call after saving a valid API Key
 * @returns {JSX.Element}
 */
export default function SettingsModal({
  open,
  onClose,
  onApiKeySaved,
}: {
  open: boolean;
  onClose: () => void;
  onApiKeySaved?: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("nvmApiKey") || "";
      setApiKey(stored);
      setTouched(false);
      setError("");
      setLoading(false);
    }
  }, [open]);

  /**
   * Validates the API Key by calling /api/credit with the given key.
   * If valid, saves the key and closes the modal. If not, shows an error.
   */
  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/credit", {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
      });
      if (!resp.ok) throw new Error("Invalid API Key");
      localStorage.setItem("nvmApiKey", apiKey.trim());
      setTouched(false);
      setLoading(false);
      if (onApiKeySaved) onApiKeySaved();
      onClose();
    } catch (e) {
      setError("Invalid API Key. Please check and try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nevermined API Key</DialogTitle>
          <DialogDescription>
            Enter your Nevermined API Key. With this key, you will be able to
            interact with a swarm of agents that will create a music video based
            on your prompt.
          </DialogDescription>
        </DialogHeader>
        <Input
          type="text"
          placeholder="Enter your NVM API Key"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setTouched(true);
            setError("");
          }}
          autoFocus
          disabled={loading}
        />
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        <DialogFooter>
          <Button onClick={handleSave} disabled={!apiKey.trim() || loading}>
            {loading ? "Validating..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
