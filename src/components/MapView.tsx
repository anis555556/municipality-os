"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MlMap, Marker, Popup, type MapMouseEvent } from "maplibre-gl";
import type { MapFeature } from "@/types";

type MapViewProps = { features: MapFeature[]; center?: { longitude: number; latitude: number }; initialZoom?: number; activeId?: string; onSelect?: (feature: MapFeature) => void; onLocationSelect?: (point: { longitude: number; latitude: number }) => void; compact?: boolean };
const styleUrl = "https://tiles.openfreemap.org/styles/liberty";
const htmlEntities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => htmlEntities[char]);

export default function MapView({ features, center = { longitude: 34.4032, latitude: 31.4394 }, initialZoom, activeId, onSelect, onLocationSelect, compact = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null); const mapRef = useRef<MlMap | null>(null); const markerRefs = useRef<Map<string, Marker>>(new Map()); const locationMarkerRef = useRef<Marker | null>(null); const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false); const [mapError, setMapError] = useState("");
  const flyTo = useCallback((point: { longitude: number; latitude: number }) => mapRef.current?.flyTo({ center: [point.longitude, point.latitude], zoom: 16.2, pitch: 61, bearing: -18, duration: 1150 }), []);
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markersForMap = markerRefs.current;
    const map = new maplibregl.Map({ container: containerRef.current, style: styleUrl, center: [center.longitude, center.latitude], zoom: compact ? Math.min(initialZoom ?? 13.4, 14.5) : initialZoom ?? 14.8, pitch: compact ? 30 : 57, bearing: -17, attributionControl: false, cooperativeGestures: true });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), "top-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
    map.on("load", () => {
      const sources = map.getStyle().sources; const vectorSource = Object.keys(sources).find((id) => sources[id].type === "vector");
      if (vectorSource && !map.getLayer("municipal-3d-buildings")) {
        try {
          map.addLayer({ id: "municipal-3d-buildings", source: vectorSource, "source-layer": "building", type: "fill-extrusion", minzoom: 13.5, filter: ["!", ["has", "hide_3d"]], paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["to-number", ["get", "render_height"]], 16], 0, "#c9d6dc", 30, "#8097a2", 90, "#172a3b"],
            "fill-extrusion-height": ["coalesce", ["to-number", ["get", "render_height"]], ["to-number", ["get", "height"]], 8],
            "fill-extrusion-base": ["coalesce", ["to-number", ["get", "render_min_height"]], ["to-number", ["get", "min_height"]], 0],
            "fill-extrusion-opacity": 0.84
          } });
        } catch { /* Some styles use a different vector schema; map labels and roads remain interactive. */ }
      }
      setReady(true);
    });
    map.on("error", (event) => { if (!map.isStyleLoaded()) setMapError("تعذر تحميل طبقات الخريطة. تحقق من اتصال الإنترنت ثم أعد المحاولة."); console.warn("MapLibre map error", event.error); });
    return () => { markersForMap.forEach((marker) => marker.remove()); markersForMap.clear(); locationMarkerRef.current?.remove(); locationMarkerRef.current = null; popupRef.current?.remove(); popupRef.current = null; map.remove(); mapRef.current = null; };
  }, [center.latitude, center.longitude, compact, initialZoom]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !ready) return;
    markerRefs.current.forEach((marker) => marker.remove()); markerRefs.current.clear();
    features.forEach((feature) => {
      const marker = document.createElement("button"); marker.type = "button"; marker.className = `map-pin map-pin-${feature.category === "مشروع بلدي" ? "project" : feature.category === "بلاغ" ? "complaint" : "facility"}${activeId === feature.id ? " is-active" : ""}`; marker.setAttribute("aria-label", `عرض ${feature.name}`); marker.textContent = feature.category === "مشروع بلدي" ? "◆" : feature.category === "بلاغ" ? "!" : "✦";
      marker.addEventListener("click", () => {
        flyTo({ longitude: feature.longitude, latitude: feature.latitude }); onSelect?.(feature);
        popupRef.current?.remove();
        popupRef.current = new Popup({ closeButton: true, closeOnClick: false, className: "municipal-popup", offset: 20, maxWidth: "250px" }).setLngLat([feature.longitude, feature.latitude]).setHTML(`<div dir="rtl"><small>${escapeHtml(feature.category)}</small><strong>${escapeHtml(feature.name)}</strong><p>${escapeHtml(feature.description)}</p>${feature.status ? `<span>${escapeHtml(feature.status)}</span>` : ""}</div>`).addTo(map);
      });
      const instance = new maplibregl.Marker({ element: marker, anchor: "bottom" }).setLngLat([feature.longitude, feature.latitude]).addTo(map); markerRefs.current.set(feature.id, instance);
    });
  }, [features, ready, activeId, onSelect, flyTo]);

  useEffect(() => { const feature = features.find((item) => item.id === activeId); if (feature) flyTo(feature); }, [activeId, features, flyTo]);
  useEffect(() => {
    const map = mapRef.current; if (!map || !ready || !onLocationSelect) return;
    const handleClick = (event: MapMouseEvent) => {
      const point = { longitude: event.lngLat.lng, latitude: event.lngLat.lat }; onLocationSelect(point);
      locationMarkerRef.current?.remove();
      const marker = document.createElement("span"); marker.className = "location-pin"; marker.setAttribute("aria-hidden", "true");
      locationMarkerRef.current = new maplibregl.Marker({ element: marker, anchor: "center" }).setLngLat([point.longitude, point.latitude]).addTo(map);
    };
    map.getCanvas().style.cursor = "crosshair"; map.on("click", handleClick);
    return () => { map.off("click", handleClick); map.getCanvas().style.cursor = ""; };
  }, [ready, onLocationSelect]);
  const zoomCity = () => mapRef.current?.flyTo({ center: [center.longitude, center.latitude], zoom: 14.8, pitch: compact ? 30 : 57, bearing: -17, duration: 1000 });
  const locateMe = () => {
    if (!navigator.geolocation) return setMapError("تحديد الموقع غير مدعوم في هذا المتصفح.");
    navigator.geolocation.getCurrentPosition(({ coords }) => { const point = { longitude: coords.longitude, latitude: coords.latitude }; flyTo(point); onLocationSelect?.(point); locationMarkerRef.current?.remove(); const marker = document.createElement("span"); marker.className = "location-pin"; marker.setAttribute("aria-hidden", "true"); if (mapRef.current) locationMarkerRef.current = new maplibregl.Marker({ element: marker, anchor: "center" }).setLngLat([point.longitude, point.latitude]).addTo(mapRef.current); }, () => setMapError("لم نتمكن من الوصول لموقعك. تحقق من صلاحية المتصفح."), { enableHighAccuracy: true, timeout: 10000 });
  };
  return <div className={`map-frame${compact ? " map-frame-compact" : ""}`}>
    <div className="map-canvas" ref={containerRef} aria-label="خريطة تفاعلية ثلاثية الأبعاد لمدينة البريج" role="application" />
    {!ready && <div className="map-loading"><span className="pulse-dot" /> جارٍ تحميل خريطة المدينة...</div>}
    <div className="map-overlay-top"><span className="map-live-dot" /> طبقات المدينة <small>نموذج تفاعلي</small></div>
    <div className="map-overlay-bottom"><button type="button" onClick={zoomCity} aria-label="العودة إلى مركز المدينة">⌖ <span>مركز المدينة</span></button><button type="button" onClick={locateMe} aria-label="تحديد موقعي الحالي">◎ <span>موقعي</span></button></div>
    {mapError && <div className="map-alert" role="status">{mapError}<button onClick={() => setMapError("")} aria-label="إغلاق التنبيه">×</button></div>}
    <div className="map-credit">© OpenStreetMap · OpenFreeMap · MapLibre</div>
  </div>;
}
