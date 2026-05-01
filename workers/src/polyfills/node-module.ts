export function createRequire(_filename: string | URL): NodeRequire {
  const req = function require(id: string): never {
    throw new Error(`Cannot use require() in Cloudflare Workers. Module "${id}" must use ESM imports.`);
  };
  req.resolve = (id: string): never => { throw new Error(`Cannot use require.resolve() in Workers.`); };
  // @ts-ignore
  req.resolve.paths = (_request: string): null => null;
  req.cache = {};
  req.extensions = {};
  req.main = undefined;
  return req as unknown as NodeRequire;
}

export function isBuiltin(_moduleName: string): boolean { return false; }
export function findSourceMap(_path: string): undefined { return undefined; }
export function syncBuiltinESMExports(): void {}
export default { createRequire, isBuiltin, findSourceMap, syncBuiltinESMExports };
