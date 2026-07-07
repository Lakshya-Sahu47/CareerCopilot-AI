function UploadForm() {
  return (
    <form className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Resume (PDF)</label>
        <input type="file" accept=".pdf" className="block w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Job Description</label>
        <textarea rows="8" className="w-full border rounded p-2"></textarea>
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Analyze Resume
      </button>
    </form>
  )
}

export default UploadForm