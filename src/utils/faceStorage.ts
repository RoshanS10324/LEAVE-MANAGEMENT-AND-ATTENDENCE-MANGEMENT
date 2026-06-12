import { supabase } from '../lib/supabaseClient'
import * as faceapi from 'face-api.js'

export async function saveFaceDescriptor(empId: string, descriptor: Float32Array | number[], confidenceScore?: number | null) {
  const descriptorArray = Array.from(descriptor)

  // Global duplicate check: scan all stored descriptors for a match
  const { data: allFaces, error: fetchError } = await supabase
    .from('face_descriptors')
    .select('emp_id, descriptor, employees(name)')

  if (!fetchError && allFaces && allFaces.length > 0) {
    const liveFloat32 = descriptor instanceof Float32Array ? descriptor : new Float32Array(descriptorArray);
    for (const row of allFaces as any[]) {
      if (row.emp_id === empId) continue;
      const stored = Array.isArray(row.descriptor) ? row.descriptor : Object.values(row.descriptor);
      if (stored.length !== 128) continue;
      const distance = faceapi.euclideanDistance(new Float32Array(stored as number[]), liveFloat32);
      if (distance <= 0.45) {
        const empName = row.employees?.name || 'another user';
        throw new Error(`This face is already registered to ${empName}. Please contact HR.`);
      }
    }
  }

  const { data, error } = await supabase
    .from('face_descriptors')
    .upsert(
      {
        emp_id: empId,
        descriptor: descriptorArray,
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        confidence_score: confidenceScore || null,
        model_version: 'face-api-js-v0.22'
      },
      { onConflict: 'emp_id' }
    )

  if (error) {
    console.error('saveFaceDescriptor error:', error)
    throw new Error('Failed to save Face ID: ' + error.message)
  }
  return data
}

export async function getFaceDescriptor(empId: string) {
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('id, emp_id, descriptor, registered_at, confidence_score')
    .eq('emp_id', empId)
    .maybeSingle()

  if (error) {
    console.error('getFaceDescriptor error:', error)
    return null
  }
  return data || null
}

export async function checkFaceRegistered(employeeId: string) {
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('id, registered_at')
    .eq('emp_id', employeeId)
    .maybeSingle()

  if (error || !data) return { registered: false, registeredAt: null }
  return { registered: true, registeredAt: data.registered_at }
}

export async function matchFaceWithDatabase(_descriptor: Float32Array | number[]) {
  return null;
}

export async function deleteFaceDescriptor(empId: string) {
  const { error } = await supabase
    .from('face_descriptors')
    .delete()
    .eq('emp_id', empId)

  if (error) throw new Error('Failed to delete Face ID: ' + error.message)
}

export async function verifyFaceDescriptor(empId: string, liveDescriptor: Float32Array | number[]) {
  // STRICT: fetch descriptor for THIS employee only using emp_id filter
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('descriptor, emp_id')
    .eq('emp_id', empId)
    .maybeSingle()

  if (error) {
    console.error('verifyFaceDescriptor error:', error)
    return { match: false, confidence: 0,
             error: 'Verification error. Try again.' }
  }

  if (!data || !data.descriptor) {
    return {
      match: false,
      confidence: 0,
      error: 'Face ID not registered for this account. Go to My Profile to register.'
    }
  }

  // Safety check: make sure the descriptor belongs to this employee
  if (data.emp_id !== empId) {
    console.error('emp_id mismatch — this should never happen')
    return { match: false, confidence: 0, error: 'Face ID mismatch. Contact HR.' }
  }

  // Convert stored jsonb array → Float32Array
  const savedArray = Array.isArray(data.descriptor)
    ? data.descriptor
    : Object.values(data.descriptor)

  if (savedArray.length !== 128) {
    return {
      match: false,
      confidence: 0,
      error: 'Stored Face ID is corrupted. Please re-register in My Profile.'
    }
  }

  const savedFloat32 = new Float32Array(savedArray)

  // Convert live descriptor → Float32Array if needed
  const liveFloat32 = liveDescriptor instanceof Float32Array
    ? liveDescriptor
    : new Float32Array(
        Array.isArray(liveDescriptor)
          ? liveDescriptor
          : Object.values(liveDescriptor)
      )

  if (liveFloat32.length !== 128) {
    return {
      match: false,
      confidence: 0,
      error: 'Face capture error. Please try again.'
    }
  }

  // Euclidean distance — smaller = more similar
  // 0.0 = identical, 1.0 = completely different
  const distance = faceapi.euclideanDistance(liveFloat32, savedFloat32)
  const confidence = parseFloat(((1 - distance) * 100).toFixed(1))

  // Threshold 0.45 = strict (need 55%+ similarity)
  const THRESHOLD = 0.45

  console.log(
    '[FaceVerify] empId:', empId,
    '| distance:', distance.toFixed(4),
    '| confidence:', confidence + '%',
    '| match:', distance <= THRESHOLD
  )

  return {
    match: distance <= THRESHOLD,
    confidence,
    distance: parseFloat(distance.toFixed(4)),
    error: distance > THRESHOLD
      ? `Face not recognized for this account (${confidence}% — need 55%+)`
      : null
  }
}

export async function getAllRegisteredEmployees() {
  const { data, error } = await supabase
    .from('face_descriptors')
    .select('emp_id, registered_at, confidence_score')
    .order('registered_at', { ascending: false })

  if (error) return []
  return data || []
}
