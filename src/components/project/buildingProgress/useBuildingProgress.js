import { useEffect, useState } from "react";
import { request } from "../../../helpers/axios_helper";

const useBuildingProgress = (projectCode) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = () => setRefreshToken((prev) => prev + 1);

  useEffect(() => {
    const normalizedCode = String(projectCode || "").trim();
    if (!normalizedCode) {
      setData(null);
      setError("");
      setLoading(false);
      return undefined;
    }

    let mounted = true;

    const loadProgress = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await request(
          "GET",
          `/api/projectbuildingprogress/${encodeURIComponent(normalizedCode)}`,
        );
        if (!mounted) return;
        setData(res?.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message || "Failed to load building progress.",
        );
        setData(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    loadProgress();

    return () => {
      mounted = false;
    };
  }, [projectCode, refreshToken]);

  return { data, loading, error, refresh };
};

export default useBuildingProgress;
