export const buildStreamById = (streams) =>
  (streams || []).reduce((acc, stream) => {
    const id = String(stream?.projectStreamId || "").trim();
    if (id) acc[id] = stream;
    return acc;
  }, {});

export const collectDescendantStreamIds = (streams, rootStreamId) => {
  const byId = buildStreamById(streams);
  const childrenByParentNumber = (streams || []).reduce((acc, stream) => {
    const parent = String(stream?.parentStreamNumber ?? "").trim();
    const number = String(stream?.streamNumber ?? "").trim();
    if (!parent || !number) return acc;
    if (!acc[parent]) acc[parent] = [];
    acc[parent].push(stream);
    return acc;
  }, {});

  const result = new Set();
  const visit = (stream) => {
    const id = String(stream?.projectStreamId || "").trim();
    if (!id || result.has(id)) return;
    result.add(id);
    const number = String(stream?.streamNumber ?? "").trim();
    (childrenByParentNumber[number] || []).forEach(visit);
  };

  const root = byId[String(rootStreamId || "").trim()];
  if (root) visit(root);
  return Array.from(result);
};

export const streamHasDescendants = (streams, stream) => {
  const number = String(stream?.streamNumber ?? "").trim();
  if (!number) return false;
  return (streams || []).some(
    (s) => String(s?.parentStreamNumber ?? "").trim() === number,
  );
};

export const isDescendantOf = (streams, candidateStream, ancestorStream) => {
  if (!candidateStream || !ancestorStream) return false;
  const ancestorNumber = String(ancestorStream?.streamNumber ?? "").trim();
  if (!ancestorNumber) return false;

  const byNumber = (streams || []).reduce((acc, stream) => {
    const number = String(stream?.streamNumber ?? "").trim();
    if (number) acc[number] = stream;
    return acc;
  }, {});

  let current = candidateStream;
  const visited = new Set();
  while (current) {
    const parentNumber = String(current?.parentStreamNumber ?? "").trim();
    if (parentNumber === ancestorNumber) return true;
    if (!parentNumber || visited.has(parentNumber)) return false;
    visited.add(parentNumber);
    current = byNumber[parentNumber];
  }
  return false;
};

export const buildStreamByNumber = (streams) =>
  (streams || []).reduce((acc, stream) => {
    const number = String(stream?.streamNumber ?? "").trim();
    if (number) acc[number] = stream;
    return acc;
  }, {});
