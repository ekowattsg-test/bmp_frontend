import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  ButtonBase,
  IconButton,
  InputAdornment,
} from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { useTranslation } from "react-i18next";
import { request } from "../../helpers/axios_helper";
import {
  getFileIcon,
  getFileIdFromLink,
  getDisplayImageInfo,
  ImageCarousel,
  ThumbnailImg,
} from "../../helpers/file_helper";
import ProductDialog from "./ProductDialog";
import { PageHeader } from "../common";
import HelpDialog from "../common/HelpDialog";

const StockTakeOn = () => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [presetProduct, setPresetProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductImage, setSelectedProductImage] = useState(null);
  const [foundStock, setFoundStock] = useState(null);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [recentRecord, setRecentRecord] = useState(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselImages, setCarouselImages] = useState([]);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const html5QrRef = useRef(null);
  const [html5Mode, setHtml5Mode] = useState(false);

  const getProductDisplayName = (stock) => {
    if (!stock) return "";
    return (
      stock.productName ||
      (stock.product && (stock.product.productName || stock.product.name)) ||
      stock.productNameEn ||
      stock.productCode ||
      ""
    );
  };

  const hasProductPictureData = (item) => {
    if (!item) return false;
    return Boolean(
      item.productPicture ||
      item.imageUrl ||
      item.productImage ||
      item.productPictureUrl ||
      (item.product &&
        (item.product.productPicture ||
          item.product.imageUrl ||
          item.product.productImage ||
          item.product.productPictureUrl)),
    );
  };

  const normalizeScannedValue = (raw) => {
    if (!raw) return null;
    let v = String(raw).trim();
    // If it's a URL, try to extract common query params or last path segment
    try {
      const u = new URL(v);
      const keys = ["stockCode", "code", "q", "id"];
      for (const k of keys) {
        if (u.searchParams.has(k)) return u.searchParams.get(k);
      }
      const segs = u.pathname.split("/").filter(Boolean);
      if (segs.length > 0) {
        const last = segs[segs.length - 1];
        if (last) return last;
      }
    } catch {
      // not a URL
    }
    return v;
  };

  // legacy native/jsQR based scanner removed; using html5-qrcode as the single scanner

  // barcode scanner removed; using html5-qrcode only

  const openHtml5QrcodeScanner = async () => {
    if (!("mediaDevices" in navigator)) {
      alert(t("stockTake.cameraNotSupported", "Camera not supported"));
      return;
    }
    try {
      stopScanner();
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 120));
    setScannerOpen(true);
    setHtml5Mode(true);
    try {
      const mod = await import("html5-qrcode");
      const Html5Qrcode =
        mod && (mod.Html5Qrcode || mod.default || mod.Html5Qrcode);
      if (!Html5Qrcode) throw new Error("Html5Qrcode not available");
      const elementId = "html5qr-scanner";
      html5QrRef.current = new Html5Qrcode(elementId);
      // tune html5-qrcode for snappier QR decoding (smaller qrbox, slightly higher fps)
      const config = { fps: 15, qrbox: 200 };
      html5QrRef.current
        .start(
          { facingMode: "environment" },
          config,
          (decoded) => {
            try {
              const final = normalizeScannedValue(decoded);
              if (final) {
                stopScanner();
                handleScan(final);
              }
            } catch (e) {
              console.debug("html5 decode callback error", e);
            }
          },
          (err) => {
            console.debug("html5-qrcode scanning error", err);
          },
        )
        .catch((startErr) => {
          console.error("html5-qrcode start failed", startErr);
          alert(t("stockTake.cameraFailed", "Failed to open camera"));
          setScannerOpen(false);
          setHtml5Mode(false);
        });
    } catch (e) {
      console.error("Html5Qrcode init failed", e);
      alert(t("stockTake.cameraFailed", "Failed to open camera"));
      setScannerOpen(false);
      setHtml5Mode(false);
    }
  };

  // quagga barcode scanner removed

  const stopScanner = () => {
    setScannerOpen(false);
    // stop html5-qrcode if active
    try {
      if (html5QrRef.current) {
        try {
          html5QrRef.current.stop().catch(() => {});
        } catch {
          /* ignore */
        }
        try {
          html5QrRef.current.clear && html5QrRef.current.clear();
        } catch {
          /* ignore */
        }
        html5QrRef.current = null;
      }
    } catch {
      /* ignore */
    }
    try {
      setHtml5Mode(false);
    } catch {
      /* ignore */
    }
    // stop video playback and clear source
    try {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {
          /* ignore */
        }
        try {
          // clear srcObject and any src to fully detach media
          videoRef.current.srcObject = null;
          videoRef.current.removeAttribute &&
            videoRef.current.removeAttribute("src");
          try {
            videoRef.current.load && videoRef.current.load();
          } catch {
            /* ignore */
          }
        } catch (e) {
          console.debug("video clear failed", e);
        }
      }
    } catch (e) {
      console.debug("video stop failed", e);
    }

    // stop media tracks
    try {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      console.debug("stream stop failed", e);
    }

    // clear other refs
    try {
      streamRef.current = null;
    } catch (e) {
      console.debug("ref cleanup failed", e);
    }
  };

  const buildImagesFromItem = (item) => {
    if (!item) return [];
    const pic =
      item.productPicture ||
      (item.product &&
        (item.product.productPicture || item.product.imageUrl)) ||
      null;
    if (!pic) return [];
    let parsed = pic;
    if (typeof pic === "string") {
      try {
        parsed = JSON.parse(pic);
      } catch {
        parsed = pic;
      }
    }
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const imgs = arr
      .map((p) => {
        const info = getDisplayImageInfo(p);
        const candidate =
          (info && info.meta && info.meta.viewUrl) ||
          info.imageUrl ||
          (typeof p === "string" ? p : p.url);
        const fileId =
          getFileIdFromLink(candidate || "") ||
          (info && info.meta && info.meta.id);
        const displayUrl =
          (info && info.meta && info.meta.viewUrl) || candidate || "";
        const title =
          (info && info.meta && info.meta.name) || (p && p.name) || "";
        return {
          displayUrl,
          fileId,
          title,
          provider: info?.meta?.provider || null,
          meta: info?.meta || null,
        };
      })
      .filter((x) => x && (x.meta?.id || x.displayUrl));
    return imgs;
  };

  const extractFirstImageUrl = (item) => {
    if (!item) return null;
    const pic =
      item.productPicture ||
      (item.product &&
        (item.product.productPicture || item.product.imageUrl)) ||
      null;
    if (!pic) return null;
    const info = getDisplayImageInfo(pic);
    console.log("StockTakeOn - extractFirstImageUrl:", info, "source:", pic);
    return info.imageUrl || null;
  };

  const extractFirstFileMeta = (item) => {
    if (!item) return null;
    const pic =
      item.productPicture ||
      (item.product &&
        (item.product.productPicture || item.product.imageUrl)) ||
      null;
    if (!pic) return null;
    const info = getDisplayImageInfo(pic);
    console.log("StockTakeOn - extractFirstFileMeta:", info, "source:", pic);
    return info.meta || null;
  };

  useEffect(() => {
    console.log(
      "StockTakeOn mounted/update - foundStock:",
      foundStock,
      "selectedProduct:",
      selectedProduct,
    );
  }, [foundStock, selectedProduct]);

  useEffect(() => {
    return () => {
      try {
        stopScanner();
      } catch (e) {
        console.debug("stopScanner unmount failed", e);
      }
    };
  }, []);

  const handleScan = async (scannedValue) => {
    const codeToUse = scannedValue ?? code;
    if (!codeToUse) return;
    // ensure UI shows the scanned code immediately
    if (scannedValue) setCode(codeToUse);
    setBusy(true);
    try {
      const res = await request(
        "GET",
        `/api/stocks/search?stockCode=${encodeURIComponent(codeToUse)}`,
      );
      const data = res.data;
      if (Array.isArray(data)) {
        if (data.length >= 1) {
          const s = data[0];
          const normalized = {
            ...s,
            stockCode: s.stockCode || s.code || s.stock_code || codeToUse,
            productName: getProductDisplayName(s),
          };
          setFoundStock(normalized);
          // if productName is missing but productId exists, fetch product record to get name
          if (
            (!normalized.productName || normalized.productName === "") &&
            normalized.productId
          ) {
            request("GET", `/api/products/${normalized.productId}`)
              .then((r) => {
                const p = r.data;
                setFoundStock((prev) => ({
                  ...prev,
                  productName:
                    (p && (p.productName || p.name || p.productNameEn)) ||
                    prev.productName,
                  productPicture:
                    (p &&
                      (p.productPicture ||
                        p.productPictureUrl ||
                        p.imageUrl ||
                        p.productImage)) ||
                    prev.productPicture,
                }));
              })
              .catch(() => {});
          }
          setSelectedProduct(null);
        } else {
          setPresetProduct(null);
          setProductDialogOpen(true);
        }
      } else if (data && (data.stockId || data.stockCode || data.product)) {
        // backend returned a single stock object (or stock with nested product) — show foundStock
        const s = data;
        const normalized = {
          ...s,
          stockCode: s.stockCode || s.code || s.stock_code || codeToUse,
          productName: getProductDisplayName(s),
        };
        setFoundStock(normalized);
        if (
          (!normalized.productName || normalized.productName === "") &&
          normalized.productId
        ) {
          request("GET", `/api/products/${normalized.productId}`)
            .then((r) => {
              const p = r.data;
              setFoundStock((prev) => ({
                ...prev,
                productName:
                  (p && (p.productName || p.name || p.productNameEn)) ||
                  prev.productName,
                productPicture:
                  (p &&
                    (p.productPicture ||
                      p.productPictureUrl ||
                      p.imageUrl ||
                      p.productImage)) ||
                  prev.productPicture,
              }));
            })
            .catch(() => {});
        }
        setSelectedProduct(null);
      } else if (data && data.productId) {
        // backend returned a product object but no stock — open product select dialog with preset
        setFoundStock(null);
        setPresetProduct(data);
        setProductDialogOpen(true);
      } else {
        setPresetProduct(null);
        setProductDialogOpen(true);
      }
    } catch (err) {
      if (err && err.response && err.response.status === 404) {
        setPresetProduct(null);
        setProductDialogOpen(true);
      } else {
        console.error(err);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCreateStockAndMove = async (selected) => {
    // Dialog now only returns a product object; store it and let parent handle stock/movement on Record
    if (selected && selected.product) {
      const product = selected.product;
      setSelectedProduct(product);
      // ProductDialog now returns Drive-based productPicture (JSON string or url). We don't have File objects here.
      setSelectedProductImage(null);

      // Selection dialogs may return summary records without productPicture.
      // Fetch full product details to ensure thumbnail metadata is available.
      if (!hasProductPictureData(product) && product.productId) {
        try {
          const productRes = await request(
            "GET",
            `/api/products/${product.productId}`,
          );
          const fullProduct = productRes?.data;
          if (fullProduct) {
            setSelectedProduct((prev) => ({
              ...prev,
              ...fullProduct,
              productPicture:
                fullProduct.productPicture ||
                fullProduct.productPictureUrl ||
                fullProduct.imageUrl ||
                fullProduct.productImage ||
                prev?.productPicture ||
                null,
            }));
          }
        } catch (err) {
          console.debug(
            "StockTakeOn: failed to load full product details",
            err,
          );
        }
      }
    } else if (
      selected &&
      selected.product === undefined &&
      selected.productFound === false
    ) {
      // product not found and user closed/create flow without product — clear selection
      setSelectedProduct(null);
    }
    setProductDialogOpen(false);
  };

  const handleRecord = async () => {
    const quantity = Number(qty);
    if (!(quantity > 0)) {
      alert(t("stockTake.quantityRequired"));
      return;
    }

    setBusy(true);
    try {
      let productId = null;
      let stockId = null;

      if (foundStock) {
        // use existing stock if available
        if (foundStock.stockId) {
          stockId = foundStock.stockId;
        } else if (foundStock.productId) {
          productId = foundStock.productId;
          const stockRes = await request("POST", "/api/stocks", {
            productId,
            stockCode: code,
            createDate: new Date().toISOString(),
          });
          stockId = stockRes.data && stockRes.data.stockId;
        } else {
          throw new Error(
            "No product information available for scanned stock code",
          );
        }
      } else if (selectedProduct) {
        // selectedProduct should have productId (created or existing)
        if (!selectedProduct.productId) {
          // create product as fallback
          // include productPicture if provided (may be JSON-stringified array or a single URL)
          const createPayload = {
            productCode: selectedProduct.productCode || code,
            productName: selectedProduct.productName || "",
            productCategory: selectedProduct.productCategory || "C",
            productDescription: selectedProduct.productDescription || "",
            productClass: selectedProduct.productClass || null,
          };
          if (selectedProduct.productPicture)
            createPayload.productPicture = selectedProduct.productPicture;
          const prodRes = await request("POST", "/api/products", createPayload);
          productId = prodRes.data && prodRes.data.productId;
        } else {
          productId = selectedProduct.productId;
        }
        const stockRes = await request("POST", "/api/stocks", {
          productId,
          stockCode: code,
          createDate: new Date().toISOString(),
        });
        stockId = stockRes.data && stockRes.data.stockId;
      } else {
        throw new Error("No product or stock selected");
      }

      if (!stockId) throw new Error("Failed to obtain stockId");

      await request("POST", "/api/stockmovements", {
        stockId,
        movementType: "N",
        quantity,
        recordDate: new Date().toISOString(),
      });
      // show saved stock details inline instead of alert
      const savedProductName = foundStock
        ? getProductDisplayName(foundStock)
        : selectedProduct
          ? getProductDisplayName(selectedProduct)
          : "";
      setRecentRecord({
        stockId,
        productId,
        productName: savedProductName,
        stockCode: code,
        quantity,
        recordedAt: new Date().toISOString(),
      });
      // reset for next scan input but keep recentRecord visible
      setFoundStock(null);
      setSelectedProduct(null);
      setPresetProduct(null);
      setSelectedProductImage(null);
      setCode("");
      setQty(1);
    } catch (err) {
      console.error(err);
      alert(t("stockTake.failed"));
    } finally {
      setBusy(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const createMovement = async (stockId, quantityParam) => {
    const quantity =
      quantityParam !== undefined ? Number(quantityParam) : Number(qty);
    if (!(quantity > 0)) {
      // nothing to do if quantity not provided or non-positive
      alert(
        t(
          "stockTake.quantityRequired",
          "Please enter a quantity greater than zero",
        ),
      );
      return;
    }

    setBusy(true);
    try {
      await request("POST", "/api/stockmovements", {
        stockId,
        movementType: "N",
        quantity: quantity,
        recordDate: new Date().toISOString(),
      });
      setFoundStock(null);
      setQty(1);
      setCode("");
      setSelectedProductImage(null);
      alert(t("stockTake.success"));
    } catch (err) {
      console.error("create movement failed", err);
      alert(t("stockTake.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("stockTake.title")}
        subtitle={t("stockTake.subtitle")}
        onHelpClick={() => setHelpOpen(true)}
        icon={QrCodeScannerIcon}
      />

      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("stockTake.helpTitle", "Stock take help")}
        content={t(
          "stockTake.helpBody",
          "Scan or enter stock codes to record stock movements. Use the scanner button to open a camera-based QR/Barcode scanner.",
        )}
      />

      <Box sx={{ maxWidth: 640, mx: "auto", p: 2 }}>
        {!foundStock && !selectedProduct && !productDialogOpen && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ mb: 1 }}>{t("stockTake.scanHint")}</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("stockTake.scanPlaceholder")}
                fullWidth
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => openHtml5QrcodeScanner()}
                        aria-label={t(
                          "stockTake.openScannerHtml5",
                          "Scan (alt)",
                        )}
                      >
                        <QrCodeScannerIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={() => handleScan()}
                disabled={busy || !code}
              >
                {t("stockTake.scan")}
              </Button>
            </Box>
            {recentRecord && (
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="subtitle2">
                  {t("stockTake.lastRecorded", "Last recorded stock")}
                </Typography>
                <Typography variant="body2">
                  {t("stockTake.productName", "Product name")}:{" "}
                  {recentRecord.productName}
                </Typography>
                <Typography variant="body2">
                  {t("stockTake.stockCode", "Stock code")}:{" "}
                  {recentRecord.stockCode}
                </Typography>
                <Typography variant="body2">
                  {t("stockTake.quantity", "Quantity")}: {recentRecord.quantity}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {new Date(recentRecord.recordedAt).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {foundStock && (
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 2,
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {(() => {
                const img = extractFirstImageUrl(foundStock);
                const meta = extractFirstFileMeta(foundStock);
                if (meta?.id) {
                  const imgs = buildImagesFromItem(foundStock);
                  return (
                    <ButtonBase
                      onClick={() => {
                        console.log("StockTakeOn: thumbnail clicked", imgs);
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{ display: "inline-block", borderRadius: 1 }}
                    >
                      <Box sx={{ width: 64, height: 64, position: "relative" }}>
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 1,
                            bgcolor: "background.paper",
                          }}
                        >
                          {getFileIcon(meta.mimeType, meta.name)}
                        </Box>
                        <Box sx={{ position: "absolute", inset: 0 }}>
                          <ThumbnailImg
                            fileId={meta.id}
                            viewUrl={meta.viewUrl || ""}
                            provider={meta.provider || null}
                            width={64}
                            height={64}
                            alt={meta.name || "product image"}
                            style={{ borderRadius: 4 }}
                          />
                        </Box>
                      </Box>
                    </ButtonBase>
                  );
                }
                if (img) {
                  const imgs = buildImagesFromItem(foundStock);
                  return (
                    <ButtonBase
                      onClick={() => {
                        console.log("StockTakeOn: thumbnail clicked", imgs);
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{ display: "inline-block", borderRadius: 1 }}
                    >
                      <Box
                        component="img"
                        src={img}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                    </ButtonBase>
                  );
                }
                if (meta) {
                  return (
                    <ButtonBase
                      onClick={() => {
                        const imgs = buildImagesFromItem(foundStock);
                        console.log("StockTakeOn: icon clicked", imgs);
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      {getFileIcon(meta.mimeType, meta.name)}
                    </ButtonBase>
                  );
                }
                return (
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📦</span>
                  </Box>
                );
              })()}
              <Box>
                <Typography>
                  {t("stockTake.productName", "Product name")}:{" "}
                  {getProductDisplayName(foundStock)}
                </Typography>
                <Typography>
                  {t("stockTake.stockCode", "Stock code")}:{" "}
                  {foundStock.stockCode}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 2, alignItems: "center" }}>
              <TextField
                label={t("stockTake.quantity")}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleRecord}
                disabled={busy}
              >
                {t("stockTake.record")}
              </Button>
              <Button variant="outlined" onClick={() => setFoundStock(null)}>
                {t("basic.cancel")}
              </Button>
            </Box>
          </Box>
        )}

        {selectedProduct && (
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              p: 2,
              borderRadius: 1,
              mt: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {(() => {
                const img = extractFirstImageUrl(selectedProduct);
                const meta = extractFirstFileMeta(selectedProduct);
                if (!img && selectedProductImage) {
                  const url = URL.createObjectURL(selectedProductImage);
                  return (
                    <ButtonBase
                      onClick={() => {
                        const imgs = [
                          { url, title: selectedProduct.productName || "" },
                        ];
                        console.log("StockTakeOn: local file clicked", imgs);
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{ display: "inline-block", borderRadius: 1 }}
                    >
                      <Box
                        component="img"
                        src={url}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                    </ButtonBase>
                  );
                }
                if (meta?.id) {
                  const imgs = buildImagesFromItem(selectedProduct);
                  return (
                    <ButtonBase
                      onClick={() => {
                        console.log(
                          "StockTakeOn: selectedProduct thumbnail clicked",
                          imgs,
                        );
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{ display: "inline-block", borderRadius: 1 }}
                    >
                      <Box sx={{ width: 64, height: 64, position: "relative" }}>
                        <Box
                          sx={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 1,
                            bgcolor: "background.paper",
                          }}
                        >
                          {getFileIcon(meta.mimeType, meta.name)}
                        </Box>
                        <Box sx={{ position: "absolute", inset: 0 }}>
                          <ThumbnailImg
                            fileId={meta.id}
                            viewUrl={meta.viewUrl || ""}
                            provider={meta.provider || null}
                            width={64}
                            height={64}
                            alt={meta.name || "product image"}
                            style={{ borderRadius: 4 }}
                          />
                        </Box>
                      </Box>
                    </ButtonBase>
                  );
                }
                if (img) {
                  const imgs = buildImagesFromItem(selectedProduct);
                  return (
                    <ButtonBase
                      onClick={() => {
                        console.log(
                          "StockTakeOn: selectedProduct thumbnail clicked",
                          imgs,
                        );
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{ display: "inline-block", borderRadius: 1 }}
                    >
                      <Box
                        component="img"
                        src={img}
                        sx={{
                          width: 64,
                          height: 64,
                          objectFit: "cover",
                          borderRadius: 1,
                        }}
                      />
                    </ButtonBase>
                  );
                }
                if (meta) {
                  const imgs = buildImagesFromItem(selectedProduct);
                  return (
                    <ButtonBase
                      onClick={() => {
                        console.log(
                          "StockTakeOn: selectedProduct icon clicked",
                          imgs,
                        );
                        if (imgs.length === 0) return;
                        setCarouselImages(imgs);
                        setCarouselStartIndex(0);
                        setCarouselOpen(true);
                      }}
                      sx={{
                        width: 64,
                        height: 64,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 1,
                        bgcolor: "background.paper",
                      }}
                    >
                      {getFileIcon(meta.mimeType, meta.name)}
                    </ButtonBase>
                  );
                }
                return (
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📦</span>
                  </Box>
                );
              })()}
              <Box>
                <Typography>
                  {t("stockTake.productName", "Product name")}:{" "}
                  {getProductDisplayName(selectedProduct)}
                </Typography>
                <Typography>
                  {t("stockTake.stockCode", "Stock code")}: {code}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
              <TextField
                label={t("stockTake.quantity")}
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleRecord}
                disabled={busy}
              >
                {t("stockTake.record")}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedProduct(null)}
              >
                {t("basic.cancel")}
              </Button>
            </Box>
          </Box>
        )}

        <ProductDialog
          open={productDialogOpen}
          onClose={() => {
            setProductDialogOpen(false);
            setPresetProduct(null);
          }}
          stockCode={code}
          presetProduct={presetProduct}
          onSelected={handleCreateStockAndMove}
        />
        {scannerOpen && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.6)",
            }}
          >
            <Box
              sx={{
                width: 320,
                maxWidth: "90%",
                bgcolor: "background.paper",
                p: 1,
                borderRadius: 1,
              }}
            >
              {html5Mode ? (
                <div
                  id="html5qr-scanner"
                  style={{ width: "100%", height: 240, borderRadius: 6 }}
                />
              ) : (
                <video
                  ref={videoRef}
                  style={{ width: "100%", borderRadius: 6 }}
                  muted
                  playsInline
                />
              )}
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  justifyContent: "flex-end",
                  mt: 1,
                }}
              >
                <Button variant="outlined" onClick={() => stopScanner()}>
                  {t("basic.cancel", "Cancel")}
                </Button>
              </Box>
            </Box>
          </Box>
        )}
        <ImageCarousel
          images={carouselImages}
          open={carouselOpen}
          startIndex={carouselStartIndex}
          onClose={() => setCarouselOpen(false)}
        />
      </Box>
    </Box>
  );
};

export default StockTakeOn;
