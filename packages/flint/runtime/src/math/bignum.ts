import { flintNone, flintSome, type FlintOption } from '../collections.js';

import { FLINT_MATH_EPSILON } from './ieee754.js';

// ==========================================
// 8. General Linear Algebra & Dynamic Matrix
// ==========================================

/** D Matrix representation. */
export interface FlintDMatrix {
  readonly rows: number;
  readonly cols: number;
  readonly data: number[];
}

/** L U Decomposition representation. */
export interface FlintLUDecomposition {
  readonly lu: FlintDMatrix;
  readonly pivot: readonly number[];
  readonly parity: number;
}

/** Q R Decomposition representation. */
export interface FlintQRDecomposition {
  readonly q: FlintDMatrix;
  readonly r: FlintDMatrix;
}

/** Cholesky Decomposition representation. */
export interface FlintCholeskyDecomposition {
  readonly l: FlintDMatrix;
}

/** S V D Decomposition representation. */
export interface FlintSVDDecomposition {
  readonly u: FlintDMatrix;
  readonly s: readonly number[];
  readonly vt: FlintDMatrix;
}

/** Eigen Decomposition representation. */
export interface FlintEigenDecomposition {
  readonly values: readonly number[];
  readonly vectors: FlintDMatrix;
}

/** Perform create flint d matrix operation. */
export function createFlintDMatrix(rows: number, cols: number, data?: readonly number[]): FlintDMatrix {
  const expectedLength = rows * cols;
  const buffer = new Float64Array(expectedLength);
  if (data) {
    const length = Math.min(data.length, expectedLength);
    for (let index = 0; index < length; index += 1) {
      buffer[index] = data[index] ?? 0;
    }
  }
  return {
    rows,
    cols,
    data: [...buffer],
  };
}

/** Perform d matrix zeros operation. */
export function flintDMatrixZeros(rows: number, cols: number): FlintDMatrix {
  return createFlintDMatrix(rows, cols);
}

/** Perform d matrix identity operation. */
export function flintDMatrixIdentity(size: number): FlintDMatrix {
  const mat = flintDMatrixZeros(size, size);
  const data = [...mat.data];
  for (let index = 0; index < size; index += 1) {
    data[index * size + index] = 1;
  }
  return { rows: size, cols: size, data };
}

/** Check whether a coordinate index is valid within integer bounds [0, limit). */
function isValidCoordinate(coordinate: number, limit: number): boolean {
  return Number.isInteger(coordinate) && coordinate >= 0 && coordinate < limit;
}

/** Check whether row and column indices are within matrix bounds. */
function isMatrixIndexInBounds(matrix: FlintDMatrix, row: number, col: number): boolean {
  return isValidCoordinate(row, matrix.rows) && isValidCoordinate(col, matrix.cols);
}

/** Check whether two dynamic matrices have identical dimensions. */
function haveMatchingDimensions(matrixA: FlintDMatrix, matrixB: FlintDMatrix): boolean {
  return matrixA.rows === matrixB.rows && matrixA.cols === matrixB.cols;
}

/** Check whether two matrix elements at symmetric positions are equal within tolerance. */
function areSymmetricElementsClose(matrix: FlintDMatrix, row: number, col: number, dimension: number): boolean {
  const valueA = matrix.data[row * dimension + col] ?? 0;
  const valueB = matrix.data[col * dimension + row] ?? 0;
  const tolerance = 1e-7 * Math.max(Math.abs(valueA), Math.abs(valueB), 1);
  return Math.abs(valueA - valueB) <= tolerance;
}

/** Check whether a square matrix is symmetric within numerical tolerance. */
function isMatrixSymmetric(matrix: FlintDMatrix): boolean {
  if (matrix.rows !== matrix.cols) {
    return false;
  }
  const dimension = matrix.rows;
  for (let row = 0; row < dimension; row += 1) {
    for (let col = row + 1; col < dimension; col += 1) {
      if (!areSymmetricElementsClose(matrix, row, col, dimension)) {
        return false;
      }
    }
  }
  return true;
}

/** Perform d matrix get operation. */
export function flintDMatrixGet(matrix: FlintDMatrix, row: number, col: number): FlintOption<number> {
  if (!isMatrixIndexInBounds(matrix, row, col)) {
    return flintNone();
  }
  return flintSome(matrix.data[row * matrix.cols + col] ?? 0);
}

/** Perform d matrix set operation. */
export function flintDMatrixSet(matrix: FlintDMatrix, row: number, col: number, value: number): boolean {
  if (!isMatrixIndexInBounds(matrix, row, col)) {
    return false;
  }
  matrix.data[row * matrix.cols + col] = value;
  return true;
}

/** Perform d matrix add inplace operation. */
export function flintDMatrixAddInplace(matrixA: FlintDMatrix, matrixB: FlintDMatrix): boolean {
  if (!haveMatchingDimensions(matrixA, matrixB)) {
    return false;
  }
  const total = matrixA.rows * matrixA.cols;
  const aData = matrixA.data;
  const bData = matrixB.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) + (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix sub inplace operation. */
export function flintDMatrixSubInplace(matrixA: FlintDMatrix, matrixB: FlintDMatrix): boolean {
  if (!haveMatchingDimensions(matrixA, matrixB)) {
    return false;
  }
  const total = matrixA.rows * matrixA.cols;
  const aData = matrixA.data;
  const bData = matrixB.data;
  for (let index = 0; index < total; index += 1) {
    aData[index] = (aData[index] ?? 0) - (bData[index] ?? 0);
  }
  return true;
}

/** Perform d matrix scale inplace operation. */
export function flintDMatrixScaleInplace(matrix: FlintDMatrix, factor: number): void {
  const total = matrix.rows * matrix.cols;
  const mData = matrix.data;
  for (let index = 0; index < total; index += 1) {
    mData[index] = (mData[index] ?? 0) * factor;
  }
}

/** Accumulate a scaled row of matrix B into the target output row. */
function accumulateScaledRow(
  outData: number[],
  outRowOffset: number,
  bData: readonly number[],
  bRowOffset: number,
  bCols: number,
  scaledA: number,
): void {
  for (let col = 0; col < bCols; col += 1) {
    const bValue = bData[bRowOffset + col] ?? 0;
    outData[outRowOffset + col] = (outData[outRowOffset + col] ?? 0) + scaledA * bValue;
  }
}

/** Accumulate row-column dot product into output matrix. */
function accumulateRowProduct(
  outData: number[],
  row: number,
  matrixA: FlintDMatrix,
  matrixB: FlintDMatrix,
  alpha: number,
): void {
  const outRowOffset = row * matrixB.cols;
  for (let kIndex = 0; kIndex < matrixA.cols; kIndex += 1) {
    const aValue = matrixA.data[row * matrixA.cols + kIndex] ?? 0;
    if (aValue !== 0) {
      const scaledA = aValue * alpha;
      accumulateScaledRow(outData, outRowOffset, matrixB.data, kIndex * matrixB.cols, matrixB.cols, scaledA);
    }
  }
}

/** Check if matrix dimensions are compatible for multiplication and accumulation. */
function areMulAccumulateDimensionsValid(
  outMatrix: FlintDMatrix,
  matrixA: FlintDMatrix,
  matrixB: FlintDMatrix,
): boolean {
  return outMatrix.rows === matrixA.rows && outMatrix.cols === matrixB.cols && matrixA.cols === matrixB.rows;
}

/** Perform d matrix mul accumulate operation. */
export function flintDMatrixMulAccumulate(
  outMatrix: FlintDMatrix,
  matrixA: FlintDMatrix,
  matrixB: FlintDMatrix,
  alpha = 1,
): boolean {
  if (!areMulAccumulateDimensionsValid(outMatrix, matrixA, matrixB)) {
    return false;
  }
  for (let row = 0; row < matrixA.rows; row += 1) {
    accumulateRowProduct(outMatrix.data, row, matrixA, matrixB, alpha);
  }
  return true;
}

/** Perform d matrix transpose operation. */
export function flintDMatrixTranspose(matrix: FlintDMatrix): FlintDMatrix {
  const resultData = new Float64Array(matrix.rows * matrix.cols);
  for (let row = 0; row < matrix.rows; row += 1) {
    for (let col = 0; col < matrix.cols; col += 1) {
      resultData[col * matrix.rows + row] = matrix.data[row * matrix.cols + col] ?? 0;
    }
  }
  return { rows: matrix.cols, cols: matrix.rows, data: [...resultData] };
}

/** Perform d matrix mul operation. */
export function flintDMatrixMul(matrixA: FlintDMatrix, matrixB: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrixA.cols !== matrixB.rows) {
    return flintNone();
  }
  const result = flintDMatrixZeros(matrixA.rows, matrixB.cols);
  flintDMatrixMulAccumulate(result, matrixA, matrixB, 1);
  return flintSome(result);
}

/** Find pivot row with maximum absolute value in current column for LU factorization. */
function findLUPivotRow(
  luData: readonly number[],
  dimension: number,
  currentIndex: number,
): { maxRow: number; maxValue: number } {
  let maxRow = currentIndex;
  let maxValue = Math.abs(luData[currentIndex * dimension + currentIndex] ?? 0);
  for (let kIndex = currentIndex + 1; kIndex < dimension; kIndex += 1) {
    const value = Math.abs(luData[kIndex * dimension + currentIndex] ?? 0);
    if (value > maxValue) {
      maxValue = value;
      maxRow = kIndex;
    }
  }
  return { maxRow, maxValue };
}

/** Swap two rows in a flat row-major matrix buffer. */
function swapMatrixBufferRows(buffer: number[], dimension: number, rowA: number, rowB: number): void {
  const offsetA = rowA * dimension;
  const offsetB = rowB * dimension;
  for (let col = 0; col < dimension; col += 1) {
    const temporaryValue = buffer[offsetA + col] ?? 0;
    buffer[offsetA + col] = buffer[offsetB + col] ?? 0;
    buffer[offsetB + col] = temporaryValue;
  }
}

/** Swap two rows in LU decomposition matrix and permutation vector. */
function swapLURows(luData: number[], pivot: number[], dimension: number, rowA: number, rowB: number): void {
  const temporaryPivot = pivot[rowA] ?? 0;
  pivot[rowA] = pivot[rowB] ?? 0;
  pivot[rowB] = temporaryPivot;
  swapMatrixBufferRows(luData, dimension, rowA, rowB);
}

/** Subtract scaled pivot row from a target row during LU column elimination. */
function updateLURow(luData: number[], dimension: number, row: number, currentIndex: number, factor: number): void {
  for (let col = currentIndex + 1; col < dimension; col += 1) {
    luData[row * dimension + col] =
      (luData[row * dimension + col] ?? 0) - factor * (luData[currentIndex * dimension + col] ?? 0);
  }
}

/** Eliminate lower triangular column entries during LU factorization. */
function eliminateLUColumn(luData: number[], dimension: number, currentIndex: number): void {
  const diag = luData[currentIndex * dimension + currentIndex] ?? 1;
  for (let row = currentIndex + 1; row < dimension; row += 1) {
    const factor = (luData[row * dimension + currentIndex] ?? 0) / diag;
    luData[row * dimension + currentIndex] = factor;
    updateLURow(luData, dimension, row, currentIndex, factor);
  }
}

/** Perform d matrix l u operation. */
export function flintDMatrixLU(matrix: FlintDMatrix): FlintOption<FlintLUDecomposition> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const dimension = matrix.rows;
  const lu = [...matrix.data];
  const pivot = Array.from({ length: dimension }, (_, index) => index);
  let parity = 1;

  for (let index = 0; index < dimension; index += 1) {
    const { maxRow, maxValue } = findLUPivotRow(lu, dimension, index);
    if (maxValue <= FLINT_MATH_EPSILON) {
      return flintNone();
    }
    if (maxRow !== index) {
      swapLURows(lu, pivot, dimension, index, maxRow);
      parity = -parity;
    }
    eliminateLUColumn(lu, dimension, index);
  }

  return flintSome({
    lu: { rows: dimension, cols: dimension, data: lu },
    pivot,
    parity,
  });
}

/** Compute dot product between previous Q column and current matrix column. */
function computeGramSchmidtProjectionDot(
  qData: Float64Array,
  matrixData: readonly number[],
  rows: number,
  cols: number,
  currentCol: number,
  previousColumn: number,
): number {
  let dotProduct = 0;
  for (let row = 0; row < rows; row += 1) {
    dotProduct += (qData[row * cols + previousColumn] ?? 0) * (matrixData[row * cols + currentCol] ?? 0);
  }
  return dotProduct;
}

/** Subtract scaled Q basis column from current Q column. */
function subtractGramSchmidtProjection(
  qData: Float64Array,
  rows: number,
  cols: number,
  currentCol: number,
  previousColumn: number,
  dotProduct: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    qData[row * cols + currentCol] =
      (qData[row * cols + currentCol] ?? 0) - dotProduct * (qData[row * cols + previousColumn] ?? 0);
  }
}

/** Project and subtract previous orthogonal column during Gram-Schmidt process. */
function projectGramSchmidtColumn(
  qData: Float64Array,
  rData: Float64Array,
  matrixData: readonly number[],
  rows: number,
  cols: number,
  currentCol: number,
  previousColumn: number,
): void {
  const dotProduct = computeGramSchmidtProjectionDot(qData, matrixData, rows, cols, currentCol, previousColumn);
  rData[previousColumn * cols + currentCol] = dotProduct;
  subtractGramSchmidtProjection(qData, rows, cols, currentCol, previousColumn, dotProduct);
}

/** Compute Euclidean norm of a column in a matrix buffer. */
function computeColumnNorm(data: Float64Array, rows: number, cols: number, col: number): number {
  let normSq = 0;
  for (let row = 0; row < rows; row += 1) {
    const value = data[row * cols + col] ?? 0;
    normSq += value * value;
  }
  return Math.sqrt(normSq);
}

/** Copy source matrix column into Q matrix buffer. */
function copySourceColumnToQ(
  qData: Float64Array,
  matrixData: readonly number[],
  rows: number,
  cols: number,
  columnIndex: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    qData[row * cols + columnIndex] = matrixData[row * cols + columnIndex] ?? 0;
  }
}

/** Scale column entries by reciprocal norm during Gram-Schmidt normalization. */
function normalizeGramSchmidtColumn(
  qData: Float64Array,
  rows: number,
  cols: number,
  columnIndex: number,
  invNorm: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    qData[row * cols + columnIndex] = (qData[row * cols + columnIndex] ?? 0) * invNorm;
  }
}

/** Compute orthogonalized Gram-Schmidt column and update Q and R matrices. */
function computeGramSchmidtColumn(
  qData: Float64Array,
  rData: Float64Array,
  matrixData: readonly number[],
  rows: number,
  cols: number,
  columnIndex: number,
): boolean {
  copySourceColumnToQ(qData, matrixData, rows, cols, columnIndex);
  for (let previousIndex = 0; previousIndex < columnIndex; previousIndex += 1) {
    projectGramSchmidtColumn(qData, rData, matrixData, rows, cols, columnIndex, previousIndex);
  }
  const norm = computeColumnNorm(qData, rows, cols, columnIndex);
  if (norm <= FLINT_MATH_EPSILON) {
    return false;
  }
  rData[columnIndex * cols + columnIndex] = norm;
  normalizeGramSchmidtColumn(qData, rows, cols, columnIndex, 1 / norm);
  return true;
}

/** Perform d matrix q r operation. */
export function flintDMatrixQR(matrix: FlintDMatrix): FlintOption<FlintQRDecomposition> {
  const rows = matrix.rows;
  const cols = matrix.cols;
  if (rows < cols) {
    return flintNone();
  }

  const qData = new Float64Array(rows * cols);
  const rData = new Float64Array(cols * cols);

  for (let index = 0; index < cols; index += 1) {
    if (!computeGramSchmidtColumn(qData, rData, matrix.data, rows, cols, index)) {
      return flintNone();
    }
  }

  return flintSome({
    q: { rows, cols, data: [...qData] },
    r: { rows: cols, cols, data: [...rData] },
  });
}

/** Compute inner dot product of previously solved lower triangular rows. */
function computeCholeskyDot(lowerData: Float64Array, dimension: number, row: number, col: number): number {
  let sum = 0;
  for (let kIndex = 0; kIndex < col; kIndex += 1) {
    sum += (lowerData[row * dimension + kIndex] ?? 0) * (lowerData[col * dimension + kIndex] ?? 0);
  }
  return sum;
}

/** Compute diagonal cell of Cholesky lower triangular factor. */
function computeCholeskyDiagonalCell(
  lowerData: Float64Array,
  matrixData: readonly number[],
  dimension: number,
  index: number,
  sum: number,
): boolean {
  const diagonalValue = (matrixData[index * dimension + index] ?? 0) - sum;
  if (diagonalValue <= FLINT_MATH_EPSILON) {
    return false;
  }
  lowerData[index * dimension + index] = Math.sqrt(diagonalValue);
  return true;
}

/** Compute off-diagonal cell of Cholesky lower triangular factor. */
function computeCholeskyOffDiagonalCell(
  lowerData: Float64Array,
  matrixData: readonly number[],
  dimension: number,
  row: number,
  col: number,
  sum: number,
): boolean {
  const diag = lowerData[col * dimension + col] ?? 1;
  if (diag <= FLINT_MATH_EPSILON) {
    return false;
  }
  lowerData[row * dimension + col] = ((matrixData[row * dimension + col] ?? 0) - sum) / diag;
  return true;
}

/** Compute a single cell of Cholesky lower triangular factor. */
function computeCholeskyCell(
  lowerData: Float64Array,
  matrixData: readonly number[],
  dimension: number,
  row: number,
  col: number,
): boolean {
  const sum = computeCholeskyDot(lowerData, dimension, row, col);
  if (row === col) {
    return computeCholeskyDiagonalCell(lowerData, matrixData, dimension, row, sum);
  }
  return computeCholeskyOffDiagonalCell(lowerData, matrixData, dimension, row, col, sum);
}

/** Compute all column entries for a single row of the Cholesky factor. */
function computeCholeskyRow(
  lowerData: Float64Array,
  matrixData: readonly number[],
  dimension: number,
  row: number,
): boolean {
  for (let col = 0; col <= row; col += 1) {
    if (!computeCholeskyCell(lowerData, matrixData, dimension, row, col)) {
      return false;
    }
  }
  return true;
}

/** Perform d matrix cholesky operation. */
export function flintDMatrixCholesky(matrix: FlintDMatrix): FlintOption<FlintCholeskyDecomposition> {
  if (!isMatrixSymmetric(matrix)) {
    return flintNone();
  }
  const dimension = matrix.rows;
  const lowerData = new Float64Array(dimension * dimension);

  for (let row = 0; row < dimension; row += 1) {
    if (!computeCholeskyRow(lowerData, matrix.data, dimension, row)) {
      return flintNone();
    }
  }

  return flintSome({
    l: { rows: dimension, cols: dimension, data: [...lowerData] },
  });
}

/** Solve lower triangular forward substitution for a single column. */
function solveForwardRowCol(
  lowerData: readonly number[],
  solution: Float64Array,
  rhsData: readonly number[],
  dimension: number,
  rhsCols: number,
  row: number,
  col: number,
  diag: number,
): void {
  let sum = 0;
  for (let kIndex = 0; kIndex < row; kIndex += 1) {
    sum += (lowerData[row * dimension + kIndex] ?? 0) * (solution[kIndex * rhsCols + col] ?? 0);
  }
  solution[row * rhsCols + col] = ((rhsData[row * rhsCols + col] ?? 0) - sum) / diag;
}

/** Perform forward substitution to solve L * y = B for Cholesky decomposition. */
function solveCholeskyForward(
  lowerData: readonly number[],
  rhsData: readonly number[],
  dimension: number,
  rhsCols: number,
): Float64Array | undefined {
  const solution = new Float64Array(dimension * rhsCols);
  for (let row = 0; row < dimension; row += 1) {
    const diag = lowerData[row * dimension + row] ?? 1;
    if (Math.abs(diag) <= FLINT_MATH_EPSILON) {
      return undefined;
    }
    for (let col = 0; col < rhsCols; col += 1) {
      solveForwardRowCol(lowerData, solution, rhsData, dimension, rhsCols, row, col, diag);
    }
  }
  return solution;
}

/** Solve upper triangular backward substitution for a single column. */
function solveBackwardRowCol(
  lowerData: readonly number[],
  solution: Float64Array,
  intermediateData: Float64Array,
  dimension: number,
  rhsCols: number,
  row: number,
  col: number,
  diag: number,
): void {
  let sum = 0;
  for (let kIndex = row + 1; kIndex < dimension; kIndex += 1) {
    sum += (lowerData[kIndex * dimension + row] ?? 0) * (solution[kIndex * rhsCols + col] ?? 0);
  }
  solution[row * rhsCols + col] = ((intermediateData[row * rhsCols + col] ?? 0) - sum) / diag;
}

/** Perform backward substitution to solve L^T * x = y for Cholesky decomposition. */
function solveCholeskyBackward(
  lowerData: readonly number[],
  intermediateData: Float64Array,
  dimension: number,
  rhsCols: number,
): Float64Array {
  const solution = new Float64Array(dimension * rhsCols);
  for (let row = dimension - 1; row >= 0; row -= 1) {
    const diag = lowerData[row * dimension + row] ?? 1;
    for (let col = 0; col < rhsCols; col += 1) {
      solveBackwardRowCol(lowerData, solution, intermediateData, dimension, rhsCols, row, col, diag);
    }
  }
  return solution;
}

/** Perform d matrix cholesky solve operation. */
export function flintDMatrixCholeskySolve(
  chol: FlintCholeskyDecomposition,
  rhsVector: FlintDMatrix,
): FlintOption<FlintDMatrix> {
  const dimension = chol.l.rows;
  if (rhsVector.rows !== dimension) {
    return flintNone();
  }

  const forwardSolution = solveCholeskyForward(chol.l.data, rhsVector.data, dimension, rhsVector.cols);
  if (!forwardSolution) {
    return flintNone();
  }

  const backwardSolution = solveCholeskyBackward(chol.l.data, forwardSolution, dimension, rhsVector.cols);
  return flintSome({ rows: dimension, cols: rhsVector.cols, data: [...backwardSolution] });
}

/** Solve forward substitution for a single row during LU solve. */
function solveForwardSubstitutionRow(
  luData: readonly number[],
  solution: Float64Array,
  dimension: number,
  rhsCols: number,
  row: number,
  col: number,
): void {
  for (let kIndex = 0; kIndex < row; kIndex += 1) {
    solution[row * rhsCols + col] =
      (solution[row * rhsCols + col] ?? 0) -
      (luData[row * dimension + kIndex] ?? 0) * (solution[kIndex * rhsCols + col] ?? 0);
  }
}

/** Subtract upper triangular row product during backward substitution. */
function subtractBackwardRowProduct(
  luData: readonly number[],
  solution: Float64Array,
  dimension: number,
  rhsCols: number,
  row: number,
  col: number,
): number {
  let sum = 0;
  for (let kIndex = row + 1; kIndex < dimension; kIndex += 1) {
    sum += (luData[row * dimension + kIndex] ?? 0) * (solution[kIndex * rhsCols + col] ?? 0);
  }
  return sum;
}

/** Solve backward substitution for a single row during LU solve. */
function solveBackwardSubstitutionRow(
  luData: readonly number[],
  solution: Float64Array,
  dimension: number,
  rhsCols: number,
  row: number,
  col: number,
): void {
  const sum = subtractBackwardRowProduct(luData, solution, dimension, rhsCols, row, col);
  const currentValue = solution[row * rhsCols + col] ?? 0;
  const diag = luData[row * dimension + row] ?? 1;
  solution[row * rhsCols + col] = (currentValue - sum) / diag;
}

/** Perform forward substitution for all rows in a single column. */
function solveForwardForColumn(
  luData: readonly number[],
  pivot: readonly number[],
  rhsData: readonly number[],
  solution: Float64Array,
  dimension: number,
  rhsCols: number,
  col: number,
): void {
  for (let row = 0; row < dimension; row += 1) {
    const pivotRow = pivot[row] ?? row;
    solution[row * rhsCols + col] = rhsData[pivotRow * rhsCols + col] ?? 0;
    solveForwardSubstitutionRow(luData, solution, dimension, rhsCols, row, col);
  }
}

/** Perform backward substitution for all rows in a single column. */
function solveBackwardForColumn(
  luData: readonly number[],
  solution: Float64Array,
  dimension: number,
  rhsCols: number,
  col: number,
): void {
  for (let row = dimension - 1; row >= 0; row -= 1) {
    solveBackwardSubstitutionRow(luData, solution, dimension, rhsCols, row, col);
  }
}

/** Perform forward and back substitution using LU decomposition. */
function solveLUSubstitution(
  luData: readonly number[],
  pivot: readonly number[],
  rhsData: readonly number[],
  dimension: number,
  rhsCols: number,
): Float64Array {
  const solution = new Float64Array(dimension * rhsCols);
  for (let col = 0; col < rhsCols; col += 1) {
    solveForwardForColumn(luData, pivot, rhsData, solution, dimension, rhsCols, col);
    solveBackwardForColumn(luData, solution, dimension, rhsCols, col);
  }
  return solution;
}

/** Perform d matrix solve operation. */
export function flintDMatrixSolve(matrixA: FlintDMatrix, rhsVector: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrixA.rows !== matrixA.cols || rhsVector.rows !== matrixA.rows) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(matrixA);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintNone();
  }
  const { lu, pivot } = luOpt.value;
  const solution = solveLUSubstitution(lu.data, pivot, rhsVector.data, matrixA.rows, rhsVector.cols);
  return flintSome({ rows: matrixA.rows, cols: rhsVector.cols, data: [...solution] });
}

/** Compute product of diagonal elements from LU factorization matrix. */
function computeLUDiagonalProduct(luData: readonly number[], dimension: number): number {
  let product = 1;
  for (let index = 0; index < dimension; index += 1) {
    product *= luData[index * dimension + index] ?? 1;
  }
  return product;
}

/** Perform d matrix determinant operation. */
export function flintDMatrixDeterminant(matrix: FlintDMatrix): FlintOption<number> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const luOpt = flintDMatrixLU(matrix);
  if (luOpt.kind === 'none' || luOpt.value === undefined) {
    return flintSome(0);
  }
  const { lu, parity } = luOpt.value;
  return flintSome(parity * computeLUDiagonalProduct(lu.data, matrix.rows));
}

/** Perform d matrix inverse operation. */
export function flintDMatrixInverse(matrix: FlintDMatrix): FlintOption<FlintDMatrix> {
  if (matrix.rows !== matrix.cols) {
    return flintNone();
  }
  const identity = flintDMatrixIdentity(matrix.rows);
  return flintDMatrixSolve(matrix, identity);
}

/** Update off-diagonal matrix entries for an index during Jacobi rotation. */
function updateOffDiagonalPair(
  matrixData: Float64Array,
  dimension: number,
  kIndex: number,
  pivotP: number,
  pivotQ: number,
  sinValue: number,
  tauValue: number,
): void {
  const akp = matrixData[kIndex * dimension + pivotP] ?? 0;
  const akq = matrixData[kIndex * dimension + pivotQ] ?? 0;
  const nextAkp = akp - sinValue * (akq + tauValue * akp);
  const nextAkq = akq + sinValue * (akp - tauValue * akq);
  matrixData[kIndex * dimension + pivotP] = nextAkp;
  matrixData[pivotP * dimension + kIndex] = nextAkp;
  matrixData[kIndex * dimension + pivotQ] = nextAkq;
  matrixData[pivotQ * dimension + kIndex] = nextAkq;
}

/** Rotate off-diagonal matrix elements during Jacobi eigenvalue sweep. */
function rotateOffDiagonal(
  matrixData: Float64Array,
  dimension: number,
  pivotP: number,
  pivotQ: number,
  sinValue: number,
  tauValue: number,
): void {
  for (let kIndex = 0; kIndex < dimension; kIndex += 1) {
    if (kIndex !== pivotP && kIndex !== pivotQ) {
      updateOffDiagonalPair(matrixData, dimension, kIndex, pivotP, pivotQ, sinValue, tauValue);
    }
  }
}

/** Rotate eigenvector basis columns during Jacobi rotation. */
function rotateBasisVectors(
  eigenvectorsData: Float64Array,
  dimension: number,
  pivotP: number,
  pivotQ: number,
  cosValue: number,
  sinValue: number,
): void {
  for (let kIndex = 0; kIndex < dimension; kIndex += 1) {
    const vkp = eigenvectorsData[kIndex * dimension + pivotP] ?? 0;
    const vkq = eigenvectorsData[kIndex * dimension + pivotQ] ?? 0;
    eigenvectorsData[kIndex * dimension + pivotP] = cosValue * vkp - sinValue * vkq;
    eigenvectorsData[kIndex * dimension + pivotQ] = sinValue * vkp + cosValue * vkq;
  }
}

/** Perform a single 2x2 plane Jacobi rotation on symmetric matrix elements and eigenvectors. */
function performJacobiEigenRotation(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
  pivotP: number,
  pivotQ: number,
): void {
  const apq = matrixData[pivotP * dimension + pivotQ] ?? 0;
  const app = matrixData[pivotP * dimension + pivotP] ?? 0;
  const aqq = matrixData[pivotQ * dimension + pivotQ] ?? 0;
  const thetaValue = (aqq - app) / (2 * apq);
  const tanValue = (thetaValue >= 0 ? 1 : -1) / (Math.abs(thetaValue) + Math.sqrt(1 + thetaValue * thetaValue));
  const cosValue = 1 / Math.sqrt(1 + tanValue * tanValue);
  const sinValue = tanValue * cosValue;
  const tauValue = sinValue / (1 + cosValue);

  matrixData[pivotP * dimension + pivotP] = app - tanValue * apq;
  matrixData[pivotQ * dimension + pivotQ] = aqq + tanValue * apq;
  matrixData[pivotP * dimension + pivotQ] = 0;
  matrixData[pivotQ * dimension + pivotP] = 0;

  rotateOffDiagonal(matrixData, dimension, pivotP, pivotQ, sinValue, tauValue);
  rotateBasisVectors(eigenvectorsData, dimension, pivotP, pivotQ, cosValue, sinValue);
}

/** Compute Euclidean norm of off-diagonal elements in symmetric matrix. */
function computeOffDiagNorm(matrixData: Float64Array, dimension: number): number {
  let offDiagNormSq = 0;
  for (let pivotP = 0; pivotP < dimension; pivotP += 1) {
    for (let pivotQ = pivotP + 1; pivotQ < dimension; pivotQ += 1) {
      const value = matrixData[pivotP * dimension + pivotQ] ?? 0;
      offDiagNormSq += value * value;
    }
  }
  return Math.sqrt(offDiagNormSq);
}

/** Perform Jacobi rotation on pivot pair if element exceeds epsilon tolerance. */
function rotatePivotIfSignificant(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
  pivotP: number,
  pivotQ: number,
  epsilon: number,
): void {
  const apq = matrixData[pivotP * dimension + pivotQ] ?? 0;
  if (Math.abs(apq) > epsilon) {
    performJacobiEigenRotation(matrixData, eigenvectorsData, dimension, pivotP, pivotQ);
  }
}

/** Perform Jacobi rotation on all upper-triangular pairs in a sweep. */
function sweepUpperTriangularPairs(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
  epsilon: number,
): void {
  for (let pivotP = 0; pivotP < dimension; pivotP += 1) {
    for (let pivotQ = pivotP + 1; pivotQ < dimension; pivotQ += 1) {
      rotatePivotIfSignificant(matrixData, eigenvectorsData, dimension, pivotP, pivotQ, epsilon);
    }
  }
}

/** Perform a complete Jacobi sweep over all off-diagonal pairs. */
function performJacobiEigenSweep(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
  epsilon: number,
): boolean {
  if (computeOffDiagNorm(matrixData, dimension) <= epsilon) {
    return true;
  }
  sweepUpperTriangularPairs(matrixData, eigenvectorsData, dimension, epsilon);
  return false;
}

/** Copy a single eigenvector column into sorted buffer. */
function copyEigenvectorColumn(sortedV: Float64Array, dimension: number, col: number, vec: readonly number[]): void {
  for (let row = 0; row < dimension; row += 1) {
    sortedV[row * dimension + col] = vec[row] ?? 0;
  }
}

/** Populate sorted eigenvector matrix columns from sorted eigen pairs. */
function populateSortedEigenvectors(
  sortedV: Float64Array,
  dimension: number,
  eigenPairs: readonly { readonly vector: readonly number[] }[],
): void {
  for (let col = 0; col < dimension; col += 1) {
    const vec = eigenPairs[col]?.vector ?? [];
    copyEigenvectorColumn(sortedV, dimension, col, vec);
  }
}

/** Sort symmetric eigenvalues in descending order and align eigenvector columns. */
function sortEigenComponents(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
): FlintEigenDecomposition {
  const eigenPairs = Array.from({ length: dimension }, (_, col) => ({
    value: matrixData[col * dimension + col] ?? 0,
    vector: Array.from({ length: dimension }, (_, row) => eigenvectorsData[row * dimension + col] ?? 0),
  }));

  eigenPairs.sort((pairA, pairB) => pairB.value - pairA.value);

  const values = eigenPairs.map((pair) => pair.value);
  const sortedV = new Float64Array(dimension * dimension);
  populateSortedEigenvectors(sortedV, dimension, eigenPairs);

  return {
    values,
    vectors: { rows: dimension, cols: dimension, data: [...sortedV] },
  };
}

/** Initialize an identity matrix buffer of given dimension. */
function createIdentityMatrixBuffer(dimension: number): Float64Array {
  const buffer = new Float64Array(dimension * dimension);
  for (let index = 0; index < dimension; index += 1) {
    buffer[index * dimension + index] = 1;
  }
  return buffer;
}

/** Execute iterative Jacobi eigenvalue sweeps. */
function iterateJacobiEigenSweeps(
  matrixData: Float64Array,
  eigenvectorsData: Float64Array,
  dimension: number,
  maxIterations: number,
  epsilon: number,
): void {
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (performJacobiEigenSweep(matrixData, eigenvectorsData, dimension, epsilon)) {
      break;
    }
  }
}

/** Perform d matrix eigen symmetric operation. */
export function flintDMatrixEigenSymmetric(
  matrix: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintEigenDecomposition> {
  if (matrix.rows === 0 || !isMatrixSymmetric(matrix)) {
    return flintNone();
  }
  const dimension = matrix.rows;
  const matrixData = new Float64Array(matrix.data);
  const eigenvectorsData = createIdentityMatrixBuffer(dimension);

  iterateJacobiEigenSweeps(matrixData, eigenvectorsData, dimension, maxIterations, epsilon);
  return flintSome(sortEigenComponents(matrixData, eigenvectorsData, dimension));
}

/** Compute Jacobi rotation parameter zeta and trigonometric coefficients. */
function computeSvdZeta(alpha: number, beta: number, gamma: number): { cosValue: number; sinValue: number } {
  const zeta = (beta - alpha) / (2 * gamma);
  const tanValue = (zeta >= 0 ? 1 : -1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta));
  const cosValue = 1 / Math.sqrt(1 + tanValue * tanValue);
  const sinValue = tanValue * cosValue;
  return { cosValue, sinValue };
}

/** Rotate pair of columns in transformed matrix during SVD. */
function rotateTransformedPair(
  transformedData: Float64Array,
  rows: number,
  cols: number,
  colJ: number,
  colK: number,
  cosValue: number,
  sinValue: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    const bj = transformedData[row * cols + colJ] ?? 0;
    const bk = transformedData[row * cols + colK] ?? 0;
    transformedData[row * cols + colJ] = cosValue * bj - sinValue * bk;
    transformedData[row * cols + colK] = sinValue * bj + cosValue * bk;
  }
}

/** Rotate pair of columns in right singular vectors during SVD. */
function rotateRightVectorsPair(
  rightVectorsData: Float64Array,
  cols: number,
  colJ: number,
  colK: number,
  cosValue: number,
  sinValue: number,
): void {
  for (let row = 0; row < cols; row += 1) {
    const vj = rightVectorsData[row * cols + colJ] ?? 0;
    const vk = rightVectorsData[row * cols + colK] ?? 0;
    rightVectorsData[row * cols + colJ] = cosValue * vj - sinValue * vk;
    rightVectorsData[row * cols + colK] = sinValue * vj + cosValue * vk;
  }
}

/** Apply Jacobi plane rotation to transformed matrix columns and right singular vectors. */
function applySvdPlaneRotation(
  transformedData: Float64Array,
  rightVectorsData: Float64Array,
  rows: number,
  cols: number,
  colJ: number,
  colK: number,
  cosValue: number,
  sinValue: number,
): void {
  rotateTransformedPair(transformedData, rows, cols, colJ, colK, cosValue, sinValue);
  rotateRightVectorsPair(rightVectorsData, cols, colJ, colK, cosValue, sinValue);
}

/** Compute dot products alpha, beta, gamma for a pair of columns in SVD. */
function computeSvdPairDots(
  transformedData: Float64Array,
  rows: number,
  cols: number,
  colJ: number,
  colK: number,
): { alpha: number; beta: number; gamma: number } {
  let alpha = 0;
  let beta = 0;
  let gamma = 0;
  for (let row = 0; row < rows; row += 1) {
    const bj = transformedData[row * cols + colJ] ?? 0;
    const bk = transformedData[row * cols + colK] ?? 0;
    alpha += bj * bj;
    beta += bk * bk;
    gamma += bj * bk;
  }
  return { alpha, beta, gamma };
}

/** Perform one-sided Jacobi rotation on a pair of columns for SVD. */
function performSvdPairRotation(
  transformedData: Float64Array,
  rightVectorsData: Float64Array,
  rows: number,
  cols: number,
  colJ: number,
  colK: number,
  epsilon: number,
): boolean {
  const { alpha, beta, gamma } = computeSvdPairDots(transformedData, rows, cols, colJ, colK);
  const denom = Math.sqrt(alpha * beta);
  if (denom <= epsilon || Math.abs(gamma) / denom <= epsilon) {
    return false;
  }
  const { cosValue, sinValue } = computeSvdZeta(alpha, beta, gamma);
  applySvdPlaneRotation(transformedData, rightVectorsData, rows, cols, colJ, colK, cosValue, sinValue);
  return true;
}

/** Perform a complete Jacobi sweep over all column pairs for SVD. */
function performSvdJacobiSweep(
  transformedData: Float64Array,
  rightVectorsData: Float64Array,
  rows: number,
  cols: number,
  epsilon: number,
): boolean {
  let rotated = false;
  for (let colJ = 0; colJ < cols; colJ += 1) {
    for (let colK = colJ + 1; colK < cols; colK += 1) {
      if (performSvdPairRotation(transformedData, rightVectorsData, rows, cols, colJ, colK, epsilon)) {
        rotated = true;
      }
    }
  }
  return !rotated;
}

/** Normalize and store a single left singular vector column. */
function populateLeftVectorColumn(
  leftVectors: Float64Array,
  transformedData: Float64Array,
  rows: number,
  cols: number,
  col: number,
  sigma: number,
  epsilon: number,
): void {
  if (sigma > epsilon) {
    const invSigma = 1 / sigma;
    for (let row = 0; row < rows; row += 1) {
      leftVectors[row * rows + col] = (transformedData[row * cols + col] ?? 0) * invSigma;
    }
  }
}

/** Compute singular values and left singular vectors from transformed matrix columns. */
function computeSingularVectorsAndValues(
  transformedData: Float64Array,
  rows: number,
  cols: number,
  epsilon: number,
): { singularValues: Float64Array; leftVectors: Float64Array } {
  const singularValues = new Float64Array(cols);
  const leftVectors = new Float64Array(rows * rows);

  for (let col = 0; col < cols; col += 1) {
    const sigma = computeColumnNorm(transformedData, rows, cols, col);
    singularValues[col] = sigma;
    populateLeftVectorColumn(leftVectors, transformedData, rows, cols, col, sigma, epsilon);
  }
  return { singularValues, leftVectors };
}

/** Compute dot product between candidate vector and existing basis vector. */
function computeBaseProjectionDot(
  candidate: Float64Array,
  leftVectors: Float64Array,
  rows: number,
  other: number,
): number {
  let dotProduct = 0;
  for (let row = 0; row < rows; row += 1) {
    dotProduct += (leftVectors[row * rows + other] ?? 0) * (candidate[row] ?? 0);
  }
  return dotProduct;
}

/** Subtract scaled basis vector from candidate vector. */
function applyBaseProjectionSubtraction(
  candidate: Float64Array,
  leftVectors: Float64Array,
  rows: number,
  other: number,
  dotProduct: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    candidate[row] = (candidate[row] ?? 0) - dotProduct * (leftVectors[row * rows + other] ?? 0);
  }
}

/** Subtract projection of other base from candidate vector. */
function subtractBaseProjection(candidate: Float64Array, leftVectors: Float64Array, rows: number, other: number): void {
  const dotProduct = computeBaseProjectionDot(candidate, leftVectors, rows, other);
  applyBaseProjectionSubtraction(candidate, leftVectors, rows, other, dotProduct);
}

/** Project a candidate vector against existing orthogonal left basis vectors. */
function projectAgainstActiveBases(
  candidate: Float64Array,
  leftVectors: Float64Array,
  rows: number,
  currentCol: number,
): void {
  for (let other = 0; other < rows; other += 1) {
    if (other !== currentCol && computeColumnNorm(leftVectors, rows, rows, other) >= 0.5) {
      subtractBaseProjection(candidate, leftVectors, rows, other);
    }
  }
}

/** Assign normalized candidate vector into left singular vectors column. */
function assignNormalizedBasisVector(
  leftVectors: Float64Array,
  candidate: Float64Array,
  rows: number,
  col: number,
  norm: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    leftVectors[row * rows + col] = (candidate[row] ?? 0) / norm;
  }
}

/** Compute squared norm of candidate vector. */
function computeVectorNormSq(vector: Float64Array, length: number): number {
  let normSq = 0;
  for (let index = 0; index < length; index += 1) {
    const value = vector[index] ?? 0;
    normSq += value * value;
  }
  return normSq;
}

/** Try generating an orthonormal basis column from a standard basis vector. */
function tryBasisCandidate(leftVectors: Float64Array, rows: number, col: number, basisIndex: number): boolean {
  const candidate = new Float64Array(rows);
  candidate[basisIndex] = 1;
  projectAgainstActiveBases(candidate, leftVectors, rows, col);

  const candidateNormSq = computeVectorNormSq(candidate, rows);
  if (candidateNormSq > 1e-4) {
    assignNormalizedBasisVector(leftVectors, candidate, rows, col, Math.sqrt(candidateNormSq));
    return true;
  }
  return false;
}

/** Construct an orthonormal basis vector for an incomplete column in left singular vectors. */
function findOrthonormalBasisVector(leftVectors: Float64Array, rows: number, col: number): boolean {
  for (let basisIndex = 0; basisIndex < rows; basisIndex += 1) {
    if (tryBasisCandidate(leftVectors, rows, col, basisIndex)) {
      return true;
    }
  }
  return false;
}

/** Complete deficient orthogonal basis columns in left singular vector matrix U. */
function completeOrthonormalBasis(leftVectors: Float64Array, rows: number): void {
  for (let col = 0; col < rows; col += 1) {
    const colNorm = computeColumnNorm(leftVectors, rows, rows, col);
    if (colNorm < 0.5) {
      findOrthonormalBasisVector(leftVectors, rows, col);
    }
  }
}

/** Extract a single column from left singular vectors matrix. */
function extractLeftVectorColumn(leftVectors: Float64Array, rows: number, col: number): number[] {
  return Array.from({ length: rows }, (_, row) => leftVectors[row * rows + col] ?? 0);
}

/** Copy a single column of values into matrix U buffer. */
function copyColumnToU(sortedU: Float64Array, rows: number, col: number, sourceCol: readonly number[]): void {
  for (let row = 0; row < rows; row += 1) {
    sortedU[row * rows + col] = sourceCol[row] ?? 0;
  }
}

/** Copy a single row of values into matrix Vt buffer. */
function copyRowToVt(sortedVt: Float64Array, cols: number, row: number, sourceRow: readonly number[]): void {
  for (let col = 0; col < cols; col += 1) {
    sortedVt[row * cols + col] = sourceRow[col] ?? 0;
  }
}

/** Build sorted left singular vector matrix U from SVD decomposition components. */
function buildSortedUMatrix(
  triplets: readonly { readonly uColumn: readonly number[] }[],
  leftVectors: Float64Array,
  rows: number,
  cols: number,
): FlintDMatrix {
  const sortedU = new Float64Array(rows * rows);
  for (let col = 0; col < rows; col += 1) {
    const sourceCol = col < cols ? (triplets[col]?.uColumn ?? []) : extractLeftVectorColumn(leftVectors, rows, col);
    copyColumnToU(sortedU, rows, col, sourceCol);
  }
  return { rows, cols: rows, data: [...sortedU] };
}

/** Build sorted right singular vector transpose matrix Vt from SVD decomposition components. */
function buildSortedVtMatrix(triplets: readonly { readonly vColumn: readonly number[] }[], cols: number): FlintDMatrix {
  const sortedVt = new Float64Array(cols * cols);
  for (let row = 0; row < cols; row += 1) {
    const vCol = triplets[row]?.vColumn ?? [];
    copyRowToVt(sortedVt, cols, row, vCol);
  }
  return { rows: cols, cols, data: [...sortedVt] };
}

/** Build sorted U and Vt matrices from SVD decomposition components. */
function buildSortedSvdMatrices(
  triplets: readonly { readonly singularValue: number; readonly uColumn: number[]; readonly vColumn: number[] }[],
  leftVectors: Float64Array,
  rows: number,
  cols: number,
): { u: FlintDMatrix; vt: FlintDMatrix } {
  return {
    u: buildSortedUMatrix(triplets, leftVectors, rows, cols),
    vt: buildSortedVtMatrix(triplets, cols),
  };
}

/** Sort SVD singular values in descending order and align orthogonal basis matrices. */
function sortSvdComponents(
  singularValues: Float64Array,
  leftVectors: Float64Array,
  rightVectorsData: Float64Array,
  rows: number,
  cols: number,
): FlintSVDDecomposition {
  const triplets = Array.from({ length: cols }, (_, col) => ({
    singularValue: singularValues[col] ?? 0,
    uColumn: Array.from({ length: rows }, (_, row) => leftVectors[row * rows + col] ?? 0),
    vColumn: Array.from({ length: cols }, (_, row) => rightVectorsData[row * cols + col] ?? 0),
  }));

  triplets.sort((tripA, tripB) => tripB.singularValue - tripA.singularValue);

  const { u, vt } = buildSortedSvdMatrices(triplets, leftVectors, rows, cols);
  return {
    u,
    s: triplets.map((item) => item.singularValue),
    vt,
  };
}

/** Handle SVD calculation for wide rectangular matrices via transposition. */
function computeWideMatrixSVD(
  matrix: FlintDMatrix,
  maxIterations: number,
  epsilon: number,
): FlintOption<FlintSVDDecomposition> {
  const transposed = flintDMatrixTranspose(matrix);
  const svdOpt = flintDMatrixSVD(transposed, maxIterations, epsilon);
  if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
    return flintNone();
  }
  const { u: uTrans, s, vt: vtTrans } = svdOpt.value;
  return flintSome({
    u: flintDMatrixTranspose(vtTrans),
    s,
    vt: flintDMatrixTranspose(uTrans),
  });
}

/** Execute SVD Jacobi sweeps until convergence or maximum iterations reached. */
function iterateSvdSweeps(
  transformedData: Float64Array,
  rightVectorsData: Float64Array,
  rows: number,
  cols: number,
  maxIterations: number,
  epsilon: number,
): void {
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (performSvdJacobiSweep(transformedData, rightVectorsData, rows, cols, epsilon)) {
      break;
    }
  }
}

/** Perform SVD decomposition for tall or square matrix. */
function computeTallMatrixSVD(
  matrix: FlintDMatrix,
  maxIterations: number,
  epsilon: number,
): FlintOption<FlintSVDDecomposition> {
  const { rows, cols } = matrix;
  const transformedData = new Float64Array(matrix.data);
  const rightVectorsData = createIdentityMatrixBuffer(cols);

  iterateSvdSweeps(transformedData, rightVectorsData, rows, cols, maxIterations, epsilon);
  const { singularValues, leftVectors } = computeSingularVectorsAndValues(transformedData, rows, cols, epsilon);
  completeOrthonormalBasis(leftVectors, rows);
  return flintSome(sortSvdComponents(singularValues, leftVectors, rightVectorsData, rows, cols));
}

/** Check if matrix has zero rows or zero columns. */
function isMatrixDimensionEmpty(matrix: FlintDMatrix): boolean {
  return matrix.rows === 0 || matrix.cols === 0;
}

/** Perform d matrix s v d operation. */
export function flintDMatrixSVD(
  matrix: FlintDMatrix,
  maxIterations = 100,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintSVDDecomposition> {
  if (isMatrixDimensionEmpty(matrix)) {
    return flintNone();
  }
  if (matrix.rows < matrix.cols) {
    return computeWideMatrixSVD(matrix, maxIterations, epsilon);
  }
  return computeTallMatrixSVD(matrix, maxIterations, epsilon);
}

/** Accumulate a scaled row of singular vector U into result matrix row. */
function accumulatePinvRow(
  result: Float64Array,
  rowOffset: number,
  uData: readonly number[],
  kIndex: number,
  cols: number,
  scaledV: number,
): void {
  for (let col = 0; col < cols; col += 1) {
    const uValue = uData[col * cols + kIndex] ?? 0;
    result[rowOffset + col] = (result[rowOffset + col] ?? 0) + scaledV * uValue;
  }
}

/** Accumulate a rank-1 singular component into pseudo-inverse result buffer. */
function accumulatePinvComponent(
  result: Float64Array,
  rows: number,
  cols: number,
  u: FlintDMatrix,
  vt: FlintDMatrix,
  kIndex: number,
  invS: number,
): void {
  for (let row = 0; row < rows; row += 1) {
    const vValue = vt.data[kIndex * rows + row] ?? 0;
    const scaledV = vValue * invS;
    accumulatePinvRow(result, row * cols, u.data, kIndex, cols, scaledV);
  }
}

/** Accumulate all singular components into pseudo-inverse result. */
function accumulateAllPinvComponents(
  result: Float64Array,
  rows: number,
  cols: number,
  u: FlintDMatrix,
  s: readonly number[],
  vt: FlintDMatrix,
  epsilon: number,
): void {
  for (const [kIndex, singularValue] of s.entries()) {
    if (singularValue > epsilon) {
      accumulatePinvComponent(result, rows, cols, u, vt, kIndex, 1 / singularValue);
    }
  }
}

/** Perform d matrix pseudoinverse operation. */
export function flintDMatrixPseudoinverse(
  matrix: FlintDMatrix,
  epsilon = FLINT_MATH_EPSILON,
): FlintOption<FlintDMatrix> {
  const svdOpt = flintDMatrixSVD(matrix, 100, epsilon);
  if (svdOpt.kind === 'none' || svdOpt.value === undefined) {
    return flintNone();
  }
  const { u, s, vt } = svdOpt.value;

  const rows = matrix.cols;
  const cols = matrix.rows;
  const result = new Float64Array(rows * cols);

  accumulateAllPinvComponents(result, rows, cols, u, s, vt, epsilon);
  return flintSome({ rows, cols, data: [...result] });
}

// ==========================================
// 9. N-Dimensional Arrays / Tensors
// ==========================================

/** Tensor Shape representation. */
export interface FlintTensorShape {
  readonly rank: number;
  readonly dimensions: readonly number[];
  readonly strides: readonly number[];
}

/** Tensor representation. */
export interface FlintTensor<TValue extends object | number | string | boolean | symbol | bigint> {
  readonly shape: FlintTensorShape;
  readonly data: TValue[];
}

/** Perform create flint tensor shape operation. */
export function createFlintTensorShape(dimensions: readonly number[]): FlintTensorShape {
  const rank = dimensions.length;
  const strides = Array.from<number>({ length: rank }).fill(1);
  let stride = 1;
  for (let index = rank - 1; index >= 0; index -= 1) {
    strides[index] = stride;
    stride *= dimensions[index] ?? 1;
  }
  return { rank, dimensions: [...dimensions], strides };
}

/** Perform tensor shape size operation. */
export function flintTensorShapeSize(shape: FlintTensorShape): number {
  return shape.dimensions.reduce((accumulator, dim) => accumulator * dim, 1);
}

/** Perform create flint tensor operation. */
export function createFlintTensor<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  data: readonly TValue[],
): FlintTensor<TValue> {
  return { shape, data: [...data] };
}

/** Perform tensor fill operation. */
export function flintTensorFill<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  value: TValue,
): FlintTensor<TValue> {
  const size = flintTensorShapeSize(shape);
  const data = Array.from<TValue>({ length: size }).fill(value);
  return { shape, data };
}

/** Perform tensor reshape operation. */
export function flintTensorReshape<TValue extends object | number | string | boolean | symbol | bigint>(
  tensor: FlintTensor<TValue>,
  newShape: FlintTensorShape,
): FlintOption<FlintTensor<TValue>> {
  if (flintTensorShapeSize(tensor.shape) !== flintTensorShapeSize(newShape)) {
    return flintNone();
  }
  return flintSome({ shape: newShape, data: tensor.data });
}

/** Tensor View representation. */
export interface FlintTensorView<TValue extends object | number | string | boolean | symbol | bigint> {
  readonly shape: FlintTensorShape;
  readonly offset: number;
  readonly data: TValue[];
}

/** Perform create flint tensor view operation. */
export function createFlintTensorView<TValue extends object | number | string | boolean | symbol | bigint>(
  shape: FlintTensorShape,
  data: readonly TValue[],
  offset = 0,
): FlintTensorView<TValue> {
  return { shape, offset, data: [...data] };
}

/** Perform tensor view operation. */
export function flintTensorView<TValue extends object | number | string | boolean | symbol | bigint>(
  tensor: FlintTensor<TValue>,
): FlintTensorView<TValue> {
  return { shape: tensor.shape, offset: 0, data: tensor.data };
}

/** Check whether a slice range [start, start + length] is valid for a given dimension size. */
function isValidSliceRange(start: number, length: number, dimension: number): boolean {
  return Number.isInteger(start) && Number.isInteger(length) && start >= 0 && length > 0 && start + length <= dimension;
}

/** Perform tensor slice operation. */
export function flintTensorSlice<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  axis: number,
  start: number,
  length: number,
): FlintOption<FlintTensorView<TValue>> {
  if (!isValidCoordinate(axis, view.shape.rank)) {
    return flintNone();
  }
  const dim = view.shape.dimensions[axis] ?? 0;
  if (!isValidSliceRange(start, length, dim)) {
    return flintNone();
  }

  const stride = view.shape.strides[axis] ?? 1;
  const newOffset = view.offset + start * stride;
  const newDimensions = [...view.shape.dimensions];
  newDimensions[axis] = length;

  return flintSome({
    shape: {
      rank: view.shape.rank,
      dimensions: newDimensions,
      strides: [...view.shape.strides],
    },
    offset: newOffset,
    data: view.data,
  });
}

/** Compute single-axis offset contribution to flat tensor index. */
function computeAxisOffset(coord: number, dim: number, stride: number): number | undefined {
  if (!isValidCoordinate(coord, dim)) {
    return undefined;
  }
  return coord * stride;
}

/** Accumulate axis offset from index coordinates into running flat offset. */
function accumulateAxisOffset(
  shape: FlintTensorShape,
  indices: readonly number[],
  axis: number,
  currentFlat: number,
): number | undefined {
  const coord = indices[axis] ?? 0;
  const dim = shape.dimensions[axis] ?? 0;
  const stride = shape.strides[axis] ?? 1;
  const axisOffset = computeAxisOffset(coord, dim, stride);
  if (axisOffset === undefined) {
    return undefined;
  }
  return currentFlat + axisOffset;
}

/** Step through all dimensions to compute flat index offset. */
function calculateFlatOffset(
  shape: FlintTensorShape,
  indices: readonly number[],
  initialOffset: number,
): number | undefined {
  let flatIndex: number | undefined = initialOffset;
  for (let index = 0; index < shape.rank; index += 1) {
    if (flatIndex === undefined) {
      return undefined;
    }
    flatIndex = accumulateAxisOffset(shape, indices, index, flatIndex);
  }
  return flatIndex;
}

/** Compute flat 1D array index from multi-dimensional coordinates in a strided tensor view. */
function computeFlatTensorIndex<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  indices: readonly number[],
): number | undefined {
  if (indices.length !== view.shape.rank) {
    return undefined;
  }
  const flatIndex = calculateFlatOffset(view.shape, indices, view.offset);
  if (flatIndex === undefined || !isValidCoordinate(flatIndex, view.data.length)) {
    return undefined;
  }
  return flatIndex;
}

/** Perform tensor view get operation. */
export function flintTensorViewGet<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  indices: readonly number[],
): FlintOption<TValue> {
  const flatIndex = computeFlatTensorIndex(view, indices);
  if (flatIndex === undefined) {
    return flintNone();
  }
  const item = view.data[flatIndex];
  if (item === undefined) {
    return flintNone();
  }
  return flintSome(item);
}

/** Perform tensor view set operation. */
export function flintTensorViewSet<TValue extends object | number | string | boolean | symbol | bigint>(
  view: FlintTensorView<TValue>,
  indices: readonly number[],
  value: TValue,
): boolean {
  const flatIndex = computeFlatTensorIndex(view, indices);
  if (flatIndex === undefined) {
    return false;
  }
  view.data[flatIndex] = value;
  return true;
}

/** Extract 2D matrix rows and columns from 2D tensor shape. */
function getTensor2DDimensions(shape: FlintTensorShape): { rows: number; cols: number } {
  return {
    rows: shape.dimensions[0] || 0,
    cols: shape.dimensions[1] || 0,
  };
}

/** Validate 2D tensor shapes compatibility for matrix multiplication. */
function areTensor2DDimensionsCompatible(tensorA: FlintTensor<number>, tensorB: FlintTensor<number>): boolean {
  if (tensorA.shape.rank !== 2 || tensorB.shape.rank !== 2) {
    return false;
  }
  const aCols = tensorA.shape.dimensions[1] ?? 0;
  const bRows = tensorB.shape.dimensions[0] ?? 0;
  return aCols === bRows;
}

/** Perform tensor matmul operation. */
export function flintTensorMatmul(
  tensorA: FlintTensor<number>,
  tensorB: FlintTensor<number>,
): FlintOption<FlintTensor<number>> {
  if (!areTensor2DDimensionsCompatible(tensorA, tensorB)) {
    return flintNone();
  }
  const { rows: aRows, cols: aCols } = getTensor2DDimensions(tensorA.shape);
  const { rows: bRows, cols: bCols } = getTensor2DDimensions(tensorB.shape);

  const dmatA = createFlintDMatrix(aRows, aCols, tensorA.data);
  const dmatB = createFlintDMatrix(bRows, bCols, tensorB.data);
  const resultMatOpt = flintDMatrixMul(dmatA, dmatB);

  if (resultMatOpt.kind === 'none' || resultMatOpt.value === undefined) {
    return flintNone();
  }
  const resultMatrix = resultMatOpt.value;
  const resultShape = createFlintTensorShape([resultMatrix.rows, resultMatrix.cols]);
  return flintSome({ shape: resultShape, data: resultMatrix.data });
}
