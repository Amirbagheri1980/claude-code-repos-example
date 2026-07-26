import type { ParticipantRole } from '../api'

interface SidebarProps {
  userName: string
  role: ParticipantRole
}

function Sidebar({ userName, role }: SidebarProps) {
  return (
    <aside className="h-fit rounded-2xl bg-white/95 shadow-xl">
      <div className="rounded-t-2xl border-b-2 border-accent-yellow bg-dark-navy px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Player</h2>
      </div>
      <table className="w-full text-left">
        <tbody>
          <tr>
            <th
              scope="row"
              className="px-6 py-4 text-xs font-medium tracking-wide text-gray-text uppercase"
            >
              Name
            </th>
            <td className="px-6 py-4 text-base font-semibold text-dark-navy">
              {userName}
            </td>
          </tr>
          <tr>
            <th
              scope="row"
              className="px-6 py-4 text-xs font-medium tracking-wide text-gray-text uppercase"
            >
              Role
            </th>
            <td className="px-6 py-4 text-base font-semibold text-dark-navy">
              {role}
            </td>
          </tr>
        </tbody>
      </table>
    </aside>
  )
}

export default Sidebar
