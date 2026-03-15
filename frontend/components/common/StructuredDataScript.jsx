import { serializeStructuredData } from "../../lib/structuredData";

export default function StructuredDataScript({ id, data }) {
  const normalizedData = Array.isArray(data) ? data.filter(Boolean) : data;

  if (!normalizedData || (Array.isArray(normalizedData) && normalizedData.length === 0)) {
    return null;
  }

  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeStructuredData(normalizedData),
      }}
    />
  );
}
